import { describe, it, expect } from 'vitest';
import { NetworkError, type ApiRequest, type ApiResponse } from '../../api';
import { SyncEngine } from '../engine';
import type { Cache, Op } from '../mapping';
import { loadOutbox, enqueue } from '../outbox';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

type Handler = (method: string, path: string, body?: unknown) => ApiResponse | undefined;

function setup(handler: Handler) {
  const storage = new MemoryStorage();
  const calls: string[] = [];
  const written: Cache[] = [];
  let offline = false;
  const request: ApiRequest = async (method, path, body) => {
    if (offline) throw new NetworkError();
    calls.push(`${method} ${path}`);
    return handler(method, path, body) ?? { status: method === 'DELETE' ? 204 : 200, data: {} };
  };
  const engine = new SyncEngine({
    request,
    storage,
    writeCache: (c) => written.push(c),
    readPrincipal: () => ({ nom: 'Principal', mode: 'prepaye' }),
    now: () => '2026-11-28T10:00:00.000Z',
  });
  return { engine, storage, calls, written, setOffline: (v: boolean) => (offline = v) };
}

const up = (resource: Op['resource'], id: string, extra: Record<string, unknown> = {}): Op => ({
  resource,
  id,
  body: { id, ...extra },
});

const principalExists: Handler = (m, p) => (m === 'GET' && p === '/compteurs/principal' ? { status: 200, data: {} } : undefined);

describe('SyncEngine.flush', () => {
  it('envoie dans l’ordre des dépendances, puis vide la file', async () => {
    const ctx = setup(principalExists);
    enqueue(ctx.storage, [
      { resource: 'achats', id: 'a0', deleted: true },
      up('parametres', '1'),
      up('achats', 'a1'),
      up('compteurs', 'c1'),
    ]);
    const r = await ctx.engine.flush();
    expect(r).toEqual({ sent: 4, complete: true });
    expect(ctx.calls).toEqual([
      'GET /compteurs/principal',
      'PUT /compteurs/c1',
      'PUT /achats/a1',
      'PUT /parametres/1',
      'DELETE /achats/a0',
    ]);
    expect(loadOutbox(ctx.storage)).toEqual([]);
    expect(ctx.engine.getStatus()).toMatchObject({ state: 'idle', pending: 0 });
  });

  it('crée la ressource (POST) quand le PUT répond 404', async () => {
    const ctx = setup((m, p) => {
      if (m === 'PUT' && p === '/achats/a1') return { status: 404, data: null };
      if (m === 'POST' && p === '/achats') return { status: 201, data: {} };
      return principalExists(m, p);
    });
    enqueue(ctx.storage, [up('achats', 'a1')]);
    await ctx.engine.flush();
    expect(ctx.calls).toContain('POST /achats');
    expect(loadOutbox(ctx.storage)).toEqual([]);
  });

  it('crée le compteur principal absent avant d’envoyer ses données', async () => {
    const ctx = setup((m, p) => {
      if (m === 'GET' && p === '/compteurs/principal') return { status: 404, data: null };
      if (m === 'POST' && p === '/compteurs') return { status: 201, data: {} };
      return undefined;
    });
    enqueue(ctx.storage, [up('achats', 'a1')]);
    await ctx.engine.flush();
    expect(ctx.calls.slice(0, 3)).toEqual(['GET /compteurs/principal', 'POST /compteurs', 'PUT /achats/a1']);
  });

  it('considère une suppression déjà faite (404) comme réussie', async () => {
    const ctx = setup((m, p) => (m === 'DELETE' ? { status: 404, data: null } : principalExists(m, p)));
    enqueue(ctx.storage, [{ resource: 'achats', id: 'a1', deleted: true }]);
    expect((await ctx.engine.flush()).complete).toBe(true);
    expect(loadOutbox(ctx.storage)).toEqual([]);
  });

  it('hors ligne : conserve toute la file et passe en « offline »', async () => {
    const ctx = setup(principalExists);
    enqueue(ctx.storage, [up('achats', 'a1'), up('achats', 'a2')]);
    ctx.setOffline(true);
    const r = await ctx.engine.flush();
    expect(r.complete).toBe(false);
    expect(loadOutbox(ctx.storage)).toHaveLength(2);
    expect(ctx.engine.getStatus()).toMatchObject({ state: 'offline', pending: 2 });

    ctx.setOffline(false);
    expect((await ctx.engine.flush()).complete).toBe(true);
    expect(loadOutbox(ctx.storage)).toEqual([]);
  });

  it('erreur serveur : s’arrête et garde l’opération pour plus tard', async () => {
    const ctx = setup((m, p) => (m === 'PUT' && p === '/achats/a1' ? { status: 503, data: null } : principalExists(m, p)));
    enqueue(ctx.storage, [up('achats', 'a1'), up('achats', 'a2')]);
    await ctx.engine.flush();
    expect(ctx.calls).not.toContain('PUT /achats/a2');
    expect(loadOutbox(ctx.storage)).toHaveLength(2);
    expect(ctx.engine.getStatus().state).toBe('error');
  });

  it('refus définitif (422) : abandonne cette opération sans bloquer les suivantes', async () => {
    const ctx = setup((m, p) =>
      m === 'PUT' && p === '/achats/a1'
        ? { status: 422, data: { violations: [{ message: 'montantAr doit être strictement supérieur à 0.' }] } }
        : principalExists(m, p),
    );
    enqueue(ctx.storage, [up('achats', 'a1'), up('achats', 'a2')]);
    const r = await ctx.engine.flush();
    expect(r).toEqual({ sent: 1, complete: true });
    expect(loadOutbox(ctx.storage)).toEqual([]);
    expect(ctx.engine.getStatus().errors[0]).toContain('a1');
    expect(ctx.engine.getStatus().errors[0]).toContain('strictement supérieur');
  });

  it('session expirée (401) : s’arrête, garde la file, état « unauth »', async () => {
    const ctx = setup((m, p) => (m === 'PUT' ? { status: 401, data: null } : principalExists(m, p)));
    enqueue(ctx.storage, [up('achats', 'a1')]);
    await ctx.engine.flush();
    expect(loadOutbox(ctx.storage)).toHaveLength(1);
    expect(ctx.engine.getStatus().state).toBe('unauth');
  });

  it('conserve une modification faite pendant l’envoi de la version précédente', async () => {
    const s = new MemoryStorage();
    const engine = new SyncEngine({
      request: async (m, p) => {
        if (m === 'PUT' && p === '/achats/a1') enqueue(s, [up('achats', 'a1', { montantAr: 2 })]);
        return { status: 200, data: {} };
      },
      storage: s,
      writeCache: () => {},
      readPrincipal: () => ({ nom: 'Principal', mode: 'prepaye' }),
    });
    enqueue(s, [up('achats', 'a1', { montantAr: 1 })]);
    await engine.flush();
    expect(loadOutbox(s)).toEqual([up('achats', 'a1', { montantAr: 2 })]);
  });
});

describe('SyncEngine.record', () => {
  it('met en file les différences d’une écriture locale', () => {
    const { engine, storage } = setup(principalExists);
    engine.record({
      kind: 'data',
      compteurId: undefined,
      before: { achats: [], releves: [] },
      after: {
        achats: [{ id: 'a1', date: '2026-11-28T09:00:00.000Z', montantAr: 1000, creditKwh: 10, prixUnitaireArPerKwh: 100 }],
        releves: [],
      },
    });
    expect(loadOutbox(storage)).toHaveLength(1);
    expect(engine.getStatus().pending).toBe(1);
    engine.stop();
  });

  it('ignore une écriture sans changement', () => {
    const { engine, storage } = setup(principalExists);
    const d = { achats: [], releves: [] };
    engine.record({ kind: 'data', compteurId: 'x', before: d, after: d });
    expect(loadOutbox(storage)).toEqual([]);
    engine.stop();
  });
});

describe('SyncEngine.pull', () => {
  const listing = (member: unknown[]) => ({ status: 200, data: { 'hydra:member': member } });
  const server: Handler = (m, p) => {
    if (m !== 'GET') return undefined;
    if (p === '/compteurs') return listing([{ '@id': '/compteurs/principal', id: 'principal', nom: 'Principal', mode: 'prepaye' }]);
    if (p === '/achats')
      return listing([{ '@id': '/achats/a1', '@type': 'Achat', id: 'a1', compteur: '/compteurs/principal', date: '2026-11-28T09:00:00.000Z', montantAr: 20000, creditKwh: 52.5, prixUnitaireArPerKwh: 380.95 }]);
    if (p === '/releves') return listing([]);
    if (p === '/parametres/1')
      return { status: 200, data: { '@id': '/parametres/1', id: 1, budgetMensuelAr: 80000, objectifKwhMois: null, uniteAffichage: 'ar', arrondiMontant: 'entier', periodeGraphiques: '30', evenementsParMois: null, compteurActif: null, modePrincipal: 'prepaye' } };
    return undefined;
  };

  it('apply : écrit le cache depuis le serveur, propriétés JSON-LD retirées', async () => {
    const { engine, written } = setup(server);
    expect(await engine.pull('apply')).toBe('applied');
    expect(written).toHaveLength(1);
    expect(written[0].settings.budgetMensuelAr).toBe(80000);
    expect(written[0].data.principal.achats[0]).toEqual({
      id: 'a1',
      date: '2026-11-28T09:00:00.000Z',
      montantAr: 20000,
      creditKwh: 52.5,
      prixUnitaireArPerKwh: 380.95,
    });
  });

  it('apply : une modification faite pendant la récupération l’emporte sur le serveur', async () => {
    const holder: { storage?: MemoryStorage } = {};
    const { engine, storage, written } = setup((m, p) => {
      // L'utilisateur supprime a1 pendant que les données serveur arrivent.
      if (m === 'GET' && p === '/releves') enqueue(holder.storage!, [{ resource: 'achats', id: 'a1', deleted: true }]);
      return server(m, p);
    });
    holder.storage = storage;
    expect(await engine.pull('apply')).toBe('applied');
    expect(written[0].data.principal.achats).toEqual([]);
    expect(loadOutbox(storage)).toHaveLength(1);
  });

  it('apply : une file qui ne peut pas être envoyée empêche d’écraser le cache', async () => {
    const { engine, storage, written } = setup((m, p) => (m === 'DELETE' ? { status: 503, data: null } : (principalExists(m, p) ?? server(m, p))));
    enqueue(storage, [{ resource: 'achats', id: 'a1', deleted: true }]);
    expect(await engine.pull('apply')).toBe('error');
    expect(written).toEqual([]);
    expect(loadOutbox(storage)).toHaveLength(1);
  });

  it('apply hors ligne : ne touche pas au cache', async () => {
    const { engine, written, setOffline } = setup(server);
    setOffline(true);
    expect(await engine.pull('apply')).toBe('offline');
    expect(written).toEqual([]);
  });

  it('apply avec session expirée : « unauth »', async () => {
    const { engine } = setup(() => ({ status: 401, data: null }));
    expect(await engine.pull('apply')).toBe('unauth');
  });

  it('check : signale un changement venant d’un autre appareil, sans toucher au cache', async () => {
    let achats = [{ id: 'a1', compteur: '/compteurs/principal', date: '2026-11-28T09:00:00.000Z', montantAr: 1, creditKwh: 1, prixUnitaireArPerKwh: 1 }];
    const { engine, written } = setup((m, p) => (m === 'GET' && p === '/achats' ? listing(achats) : server(m, p)));
    await engine.pull('apply');
    expect(await engine.pull('check')).toBe('unchanged');
    expect(engine.getStatus().updateAvailable).toBe(false);

    achats = [...achats, { id: 'a2', compteur: '/compteurs/principal', date: '2026-11-29T09:00:00.000Z', montantAr: 2, creditKwh: 2, prixUnitaireArPerKwh: 1 }];
    expect(await engine.pull('check')).toBe('changed');
    expect(engine.getStatus().updateAvailable).toBe(true);
    expect(written).toHaveLength(1);
  });

  it('check : nos propres envois ne déclenchent pas la bannière', async () => {
    let achats: unknown[] = [];
    const { engine, storage } = setup((m, p) => {
      if (m === 'PUT' && p === '/achats/a1') {
        achats = [{ id: 'a1', compteur: '/compteurs/principal', date: '2026-11-28T09:00:00.000Z', montantAr: 1, creditKwh: 1, prixUnitaireArPerKwh: 1 }];
        return { status: 200, data: {} };
      }
      if (m === 'GET' && p === '/compteurs/principal') return { status: 200, data: {} };
      return m === 'GET' && p === '/achats' ? listing(achats) : server(m, p);
    });
    await engine.pull('apply');
    enqueue(storage, [up('achats', 'a1')]);
    expect(await engine.pull('check')).toBe('unchanged');
    expect(engine.getStatus().updateAvailable).toBe(false);
  });
});

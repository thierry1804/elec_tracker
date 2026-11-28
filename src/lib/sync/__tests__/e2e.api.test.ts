/**
 * Intégration contre une vraie API (désactivée par défaut) :
 *   E2E_API=http://127.0.0.1:8000 E2E_COOKIE="electracker_session=<jeton>" npx vitest run e2e.api
 * Le compte utilisé doit être vide ; les données créées restent sur ce compte.
 */
import { describe, it, expect } from 'vitest';
import type { ApiRequest } from '../../api';
import { SyncEngine } from '../engine';
import type { Cache } from '../mapping';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const BASE = env.E2E_API;
const COOKIE = env.E2E_COOKIE ?? '';

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

const request: ApiRequest = async (method, path, body, contentType = 'application/ld+json') => {
  const res = await fetch(BASE + path, {
    method,
    headers: { Accept: 'application/ld+json', Cookie: COOKIE, ...(body !== undefined ? { 'Content-Type': contentType } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  if (res.status !== 204) data = await res.json().catch(() => null);
  return { status: res.status, data };
};

function device() {
  const storage = new MemoryStorage();
  const written: Cache[] = [];
  const engine = new SyncEngine({ request, storage, writeCache: (c) => written.push(c), readPrincipal: () => ({ nom: 'Principal', mode: 'prepaye' }) });
  return { engine, storage, written };
}

const achat = (id: string, montantAr: number, creditKwh: number) => ({
  id,
  date: '2026-11-28T09:00:00.000Z',
  montantAr,
  creditKwh,
  prixUnitaireArPerKwh: montantAr / creditKwh,
});

describe.skipIf(!BASE)('synchronisation contre la vraie API', () => {
  it('deux appareils convergent : envoi, récupération, suppression, détection de changement', async () => {
    const a = device();
    const b = device();

    // Appareil A : un compteur supplémentaire, des paramètres, des données sur les deux compteurs.
    a.engine.record({
      kind: 'settings',
      before: {},
      after: {
        compteurs: [{ id: 'compteur-1', nom: 'Maison', mode: 'postpaye' }],
        compteurActifId: 'compteur-1',
        budgetMensuelAr: 80000,
        objectifKwhMois: 150,
        periodeGraphiques: '90',
        uniteAffichage: 'kar',
        evenementsParMois: { '2026-11': 'Voyage' },
        modePrincipal: 'prepaye',
      },
    });
    a.engine.record({
      kind: 'data',
      compteurId: undefined,
      before: { achats: [], releves: [] },
      after: {
        achats: [achat('e2e-a1', 20000, 52.5)],
        releves: [
          { id: 'e2e-r1', date: '2026-11-28T09:00:00.001Z', creditRestantKwh: 64.9, fromAchat: true },
          { id: 'e2e-r2', date: '2026-11-29T09:00:00.000Z', creditRestantKwh: -1.5 },
        ],
      },
    });
    a.engine.record({
      kind: 'data',
      compteurId: 'compteur-1',
      before: { achats: [], releves: [] },
      after: { achats: [achat('e2e-a2', 10000, 25)], releves: [] },
    });
    a.engine.stop();

    const flushed = await a.engine.flush();
    expect(flushed.complete).toBe(true);
    expect(a.engine.getStatus()).toMatchObject({ pending: 0, errors: [] });

    // Appareil B, vierge : récupère tout.
    expect(await b.engine.pull('apply')).toBe('applied');
    const cache = b.written[0];
    expect(cache.settings).toMatchObject({
      budgetMensuelAr: 80000,
      objectifKwhMois: 150,
      periodeGraphiques: '90',
      uniteAffichage: 'kar',
      compteurActifId: 'compteur-1',
      evenementsParMois: { '2026-11': 'Voyage' },
      compteurs: [{ id: 'compteur-1', nom: 'Maison', mode: 'postpaye' }],
    });
    expect(cache.data.principal.achats).toEqual([achat('e2e-a1', 20000, 52.5)]);
    expect(cache.data.principal.releves).toEqual([
      { id: 'e2e-r1', date: '2026-11-28T09:00:00.001Z', creditRestantKwh: 64.9, fromAchat: true },
      { id: 'e2e-r2', date: '2026-11-29T09:00:00.000Z', creditRestantKwh: -1.5 },
    ]);
    expect(cache.data['compteur-1'].achats).toEqual([achat('e2e-a2', 10000, 25)]);

    // A supprime un achat ; B le voit via la détection de changement.
    const a2 = device();
    expect(await a2.engine.pull('apply')).toBe('applied');
    a2.engine.record({
      kind: 'data',
      compteurId: undefined,
      before: { achats: [achat('e2e-a1', 20000, 52.5)], releves: [] },
      after: { achats: [], releves: [] },
    });
    a2.engine.stop();
    expect((await a2.engine.flush()).complete).toBe(true);

    expect(await b.engine.pull('check')).toBe('changed');
    expect(b.engine.getStatus().updateAvailable).toBe(true);
    const c = device();
    await c.engine.pull('apply');
    expect(c.written[0].data.principal.achats).toEqual([]);

    // Supprimer le compteur supprime ses données (cascade serveur).
    c.engine.record({
      kind: 'settings',
      before: { compteurs: [{ id: 'compteur-1', nom: 'Maison', mode: 'postpaye' }], compteurActifId: 'compteur-1' },
      after: {},
    });
    c.engine.stop();
    expect((await c.engine.flush()).complete).toBe(true);
    const d = device();
    await d.engine.pull('apply');
    expect(d.written[0].data['compteur-1']).toBeUndefined();
    expect(d.written[0].settings.compteurActifId).toBeUndefined();
  }, 120_000);
});

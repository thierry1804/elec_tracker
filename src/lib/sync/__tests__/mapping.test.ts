import { describe, it, expect } from 'vitest';
import {
  applyOps,
  coalesce,
  diffData,
  diffSettings,
  emptySnapshot,
  parametresBody,
  snapshotToCache,
  sortOps,
  toApiDate,
  type Op,
} from '../mapping';

const achat = (id: string, montantAr = 1000) => ({
  id,
  date: '2026-11-28T09:00:00.000Z',
  montantAr,
  creditKwh: 10,
  prixUnitaireArPerKwh: montantAr / 10,
});

describe('toApiDate', () => {
  it('garde une date ISO UTC avec millisecondes', () => {
    expect(toApiDate('2026-11-28T09:00:00.000Z')).toBe('2026-11-28T09:00:00.000Z');
    expect(toApiDate('2026-11-28T12:00:00+03:00')).toBe('2026-11-28T09:00:00.000Z');
  });
  it('convertit YYYY-MM-DD en midi local', () => {
    const iso = toApiDate('2026-11-28');
    expect(new Date(iso).getHours()).toBe(12);
    expect(new Date(iso).getDate()).toBe(28);
  });
  it('laisse passer une valeur illisible (le serveur la refusera)', () => {
    expect(toApiDate('n’importe quoi')).toBe('n’importe quoi');
  });
});

describe('diffData', () => {
  it('ne produit rien si rien ne change', () => {
    const d = { achats: [achat('a1')], releves: [] };
    expect(diffData(d, d)).toEqual([]);
  });

  it('produit un upsert pour un ajout et une modification, un delete pour une suppression', () => {
    const before = { achats: [achat('a1'), achat('a2')], releves: [] };
    const after = { achats: [achat('a1', 2000), achat('a3')], releves: [] };
    const ops = diffData(before, after, 'maison');
    expect(ops.map((o) => `${o.resource}:${o.id}:${o.deleted ? 'del' : 'up'}`).sort()).toEqual(
      ['achats:a1:up', 'achats:a2:del', 'achats:a3:up'].sort(),
    );
    expect(ops.find((o) => o.id === 'a3')?.body).toMatchObject({ compteur: '/compteurs/maison', montantAr: 1000 });
  });

  it('rattache les données du compteur implicite au compteur « principal »', () => {
    const ops = diffData({ achats: [], releves: [] }, { achats: [achat('a1')], releves: [] });
    expect(ops[0].body?.compteur).toBe('/compteurs/principal');
  });

  it('envoie fromAchat en booléen', () => {
    const ops = diffData(
      { achats: [], releves: [] },
      { achats: [], releves: [{ id: 'r1', date: '2026-11-28T09:00:00.001Z', creditRestantKwh: 5 }] },
    );
    expect(ops[0].body).toMatchObject({ fromAchat: false, creditRestantKwh: 5 });
  });
});

describe('diffSettings', () => {
  it('suit les compteurs ajoutés, modifiés et supprimés', () => {
    const before = { compteurs: [{ id: 'a', nom: 'A', mode: 'prepaye' as const }, { id: 'b', nom: 'B', mode: 'prepaye' as const }] };
    const after = { compteurs: [{ id: 'a', nom: 'A', mode: 'postpaye' as const }, { id: 'c', nom: 'C', mode: 'prepaye' as const }] };
    const ops = diffSettings(before, after).filter((o) => o.resource === 'compteurs');
    expect(ops.map((o) => `${o.id}:${o.deleted ? 'del' : 'up'}`).sort()).toEqual(['a:up', 'b:del', 'c:up']);
  });

  it('envoie les paramètres complets quand un champ change', () => {
    const ops = diffSettings({}, { budgetMensuelAr: 80000, compteurActifId: 'a' });
    const p = ops.find((o) => o.resource === 'parametres');
    expect(p?.id).toBe('1');
    expect(p?.body).toMatchObject({ budgetMensuelAr: 80000, compteurActif: '/compteurs/a', periodeGraphiques: '30', objectifKwhMois: null });
  });

  it('met à jour le compteur principal quand son mode change', () => {
    const ops = diffSettings({}, { modePrincipal: 'postpaye' });
    expect(ops.find((o) => o.resource === 'compteurs' && o.id === 'principal')?.body).toMatchObject({ mode: 'postpaye' });
  });

  it('ne produit rien sans changement de valeur', () => {
    expect(diffSettings({ budgetMensuelAr: 1 }, { budgetMensuelAr: 1 })).toEqual([]);
    expect(diffSettings({}, { uniteAffichage: 'ar' })).toEqual([]);
  });

  it('parametresBody normalise les valeurs absentes', () => {
    expect(parametresBody({})).toEqual({
      budgetMensuelAr: null,
      objectifKwhMois: null,
      uniteAffichage: 'ar',
      arrondiMontant: 'entier',
      periodeGraphiques: '30',
      evenementsParMois: null,
      compteurActif: null,
      modePrincipal: 'prepaye',
    });
  });
});

describe('renommage du compteur principal', () => {
  it('envoie le nouveau nom du compteur principal', () => {
    const ops = diffSettings({}, { nomPrincipal: 'Maison' });
    expect(ops.find((o) => o.resource === 'compteurs' && o.id === 'principal')?.body).toMatchObject({
      id: 'principal',
      nom: 'Maison',
      mode: 'prepaye',
    });
  });

  it('un changement de type conserve le nom choisi', () => {
    const ops = diffSettings({ nomPrincipal: 'Maison' }, { nomPrincipal: 'Maison', modePrincipal: 'postpaye' });
    expect(ops.find((o) => o.id === 'principal')?.body).toMatchObject({ nom: 'Maison', mode: 'postpaye' });
  });

  it('ne produit rien tant que le nom reste « Principal »', () => {
    expect(diffSettings({}, { nomPrincipal: '  ' })).toEqual([]);
  });

  it('le nom du principal revient du serveur dans les réglages', () => {
    const s = emptySnapshot();
    s.compteurs = { principal: { id: 'principal', nom: 'Maison', mode: 'postpaye' } };
    expect(snapshotToCache(s).settings).toMatchObject({ nomPrincipal: 'Maison', modePrincipal: 'postpaye' });

    s.compteurs = { principal: { id: 'principal', nom: 'Principal', mode: 'prepaye' } };
    expect(snapshotToCache(s).settings.nomPrincipal).toBeUndefined();
  });

  it('le renommage d’un autre compteur produit un upsert', () => {
    const ops = diffSettings(
      { compteurs: [{ id: 'c1', nom: 'Bureau', mode: 'prepaye' }] },
      { compteurs: [{ id: 'c1', nom: 'Atelier', mode: 'prepaye' }] },
    );
    expect(ops).toEqual([{ resource: 'compteurs', id: 'c1', body: { id: 'c1', nom: 'Atelier', mode: 'prepaye' } }]);
  });
});

describe('ordre et fusion des opérations', () => {
  const up = (resource: Op['resource'], id: string): Op => ({ resource, id, body: { id } });
  const del = (resource: Op['resource'], id: string): Op => ({ resource, id, deleted: true });

  it('envoie les compteurs avant leurs données, les paramètres ensuite, les suppressions en dernier', () => {
    const sorted = sortOps([
      del('compteurs', 'x'),
      up('parametres', '1'),
      del('achats', 'a0'),
      up('achats', 'a1'),
      up('compteurs', 'c1'),
    ]);
    expect(sorted.map((o) => `${o.resource}:${o.id}`)).toEqual([
      'compteurs:c1',
      'achats:a1',
      'parametres:1',
      'achats:a0',
      'compteurs:x',
    ]);
  });

  it('conserve l’ordre d’arrivée à phase égale', () => {
    const sorted = sortOps([up('achats', 'b'), up('releves', 'a'), up('achats', 'c')]);
    expect(sorted.map((o) => o.id)).toEqual(['b', 'a', 'c']);
  });

  it('remplace une opération plus ancienne sur la même ressource', () => {
    const merged = coalesce([up('achats', 'a1'), up('achats', 'a2')], [del('achats', 'a1')]);
    expect(merged).toEqual([up('achats', 'a2'), del('achats', 'a1')]);
  });
});

describe('applyOps / snapshotToCache', () => {
  const snapshot = () => {
    const s = emptySnapshot();
    s.compteurs = {
      principal: { id: 'principal', nom: 'Principal', mode: 'prepaye' },
      maison: { id: 'maison', nom: 'Maison', mode: 'postpaye' },
    };
    s.achats = {
      a1: { id: 'a1', compteur: '/compteurs/principal', date: '2026-11-02T08:00:00.000Z', montantAr: 1, creditKwh: 1, prixUnitaireArPerKwh: 1 },
      a2: { id: 'a2', compteur: '/compteurs/maison', date: '2026-11-01T08:00:00.000Z', montantAr: 2, creditKwh: 2, prixUnitaireArPerKwh: 1 },
    };
    s.releves = {
      r1: { id: 'r1', compteur: '/compteurs/principal', date: '2026-11-02T08:00:00.001Z', creditRestantKwh: 9, fromAchat: true },
    };
    s.parametres = {
      budgetMensuelAr: 80000,
      objectifKwhMois: null,
      uniteAffichage: 'kar',
      arrondiMontant: 'entier',
      periodeGraphiques: '90',
      evenementsParMois: { '2026-11': 'Voyage' },
      compteurActif: '/compteurs/maison',
      modePrincipal: 'prepaye',
    };
    return s;
  };

  it('reconstruit réglages et données par compteur', () => {
    const cache = snapshotToCache(snapshot());
    expect(cache.settings).toMatchObject({
      budgetMensuelAr: 80000,
      uniteAffichage: 'kar',
      periodeGraphiques: '90',
      compteurActifId: 'maison',
      modePrincipal: 'prepaye',
      evenementsParMois: { '2026-11': 'Voyage' },
      compteurs: [{ id: 'maison', nom: 'Maison', mode: 'postpaye' }],
    });
    expect(cache.settings.objectifKwhMois).toBeUndefined();
    expect(cache.data.principal.achats.map((a) => a.id)).toEqual(['a1']);
    expect(cache.data.principal.releves[0]).toMatchObject({ id: 'r1', fromAchat: true });
    expect(cache.data.maison.achats.map((a) => a.id)).toEqual(['a2']);
  });

  it('le compteur principal actif correspond à l’absence de compteurActifId', () => {
    const s = snapshot();
    s.parametres = { ...s.parametres!, compteurActif: '/compteurs/principal' };
    expect(snapshotToCache(s).settings.compteurActifId).toBeUndefined();
  });

  it('superpose les modifications locales en attente à l’état serveur', () => {
    const merged = applyOps(snapshot(), [
      { resource: 'achats', id: 'a1', deleted: true },
      { resource: 'achats', id: 'a9', body: { id: 'a9', compteur: '/compteurs/principal', date: '2026-11-03T08:00:00.000Z', montantAr: 5, creditKwh: 5, prixUnitaireArPerKwh: 1 } },
    ]);
    expect(snapshotToCache(merged).data.principal.achats.map((a) => a.id)).toEqual(['a9']);
  });

  it('supprimer un compteur supprime ses données et le désactive', () => {
    const merged = applyOps(snapshot(), [{ resource: 'compteurs', id: 'maison', deleted: true }]);
    const cache = snapshotToCache(merged);
    expect(cache.data.maison).toBeUndefined();
    expect(cache.settings.compteurs).toBeUndefined();
    expect(cache.settings.compteurActifId).toBeUndefined();
  });

  it('ne modifie pas l’instantané d’origine', () => {
    const s = snapshot();
    applyOps(s, [{ resource: 'achats', id: 'a1', deleted: true }]);
    expect(Object.keys(s.achats)).toEqual(['a1', 'a2']);
  });
});

import type { Achat, AppData, AppSettings, Compteur, CompteurMode, Releve } from '../../types';

/** Le compteur « principal » (implicite côté front) est le compteur d'id `principal` côté serveur. */
export const PRINCIPAL_ID = 'principal';

/** Nom du compteur principal tant que l'utilisateur ne l'a pas renommé. */
export const NOM_PRINCIPAL = 'Principal';

export type Resource = 'compteurs' | 'achats' | 'releves' | 'parametres';

export type Body = Record<string, unknown>;

/** Opération en attente d'envoi : upsert (body) ou suppression. */
export interface Op {
  resource: Resource;
  id: string;
  body?: Body;
  deleted?: boolean;
}

export const opKey = (op: Pick<Op, 'resource' | 'id'>): string => `${op.resource}:${op.id}`;

export const compteurIri = (compteurId?: string): string => `/compteurs/${compteurId ?? PRINCIPAL_ID}`;

/** ISO 8601 UTC avec millisecondes. `YYYY-MM-DD` (anciennes données) = midi local, comme le reste de l'app. */
export function toApiDate(value: string): string {
  const d = value.includes('T')
    ? new Date(value)
    : (() => {
        const [y, m, day] = value.split('-').map(Number);
        return new Date(y, (m ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
      })();
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

export function compteurBody(id: string, nom: string, mode: CompteurMode): Body {
  return { id, nom, mode };
}

export function achatBody(a: Achat, compteurId?: string): Body {
  return {
    id: a.id,
    compteur: compteurIri(compteurId),
    date: toApiDate(a.date),
    montantAr: Number(a.montantAr),
    creditKwh: Number(a.creditKwh),
    prixUnitaireArPerKwh: Number(a.prixUnitaireArPerKwh),
  };
}

export function releveBody(r: Releve, compteurId?: string): Body {
  return {
    id: r.id,
    compteur: compteurIri(compteurId),
    date: toApiDate(r.date),
    creditRestantKwh: Number(r.creditRestantKwh),
    fromAchat: Boolean(r.fromAchat),
  };
}

export function parametresBody(s: AppSettings): Body {
  return {
    budgetMensuelAr: s.budgetMensuelAr ?? null,
    objectifKwhMois: s.objectifKwhMois ?? null,
    uniteAffichage: s.uniteAffichage ?? 'ar',
    arrondiMontant: s.arrondiMontant ?? 'entier',
    periodeGraphiques: s.periodeGraphiques ?? '30',
    evenementsParMois: s.evenementsParMois && Object.keys(s.evenementsParMois).length > 0 ? s.evenementsParMois : null,
    compteurActif: s.compteurActifId ? compteurIri(s.compteurActifId) : null,
    modePrincipal: s.modePrincipal ?? 'prepaye',
  };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Différences entre deux listes d'éléments (par id) : upserts des nouveaux/modifiés, suppressions des disparus. */
export function diffItems<T extends { id: string }>(
  resource: Resource,
  before: readonly T[],
  after: readonly T[],
  toBody: (item: T) => Body,
): Op[] {
  const ops: Op[] = [];
  const old = new Map(before.map((i) => [i.id, toBody(i)]));
  const seen = new Set<string>();
  for (const item of after) {
    seen.add(item.id);
    const body = toBody(item);
    if (!same(old.get(item.id), body)) ops.push({ resource, id: item.id, body });
  }
  for (const id of old.keys()) if (!seen.has(id)) ops.push({ resource, id, deleted: true });
  return ops;
}

export function diffData(before: AppData, after: AppData, compteurId?: string): Op[] {
  return [
    ...diffItems('achats', before.achats, after.achats, (a) => achatBody(a, compteurId)),
    ...diffItems('releves', before.releves, after.releves, (r) => releveBody(r, compteurId)),
  ];
}

export function diffSettings(before: AppSettings, after: AppSettings): Op[] {
  const ops = diffItems<Compteur>('compteurs', before.compteurs ?? [], after.compteurs ?? [], (c) =>
    compteurBody(c.id, c.nom, c.mode),
  );
  const modeBefore = before.modePrincipal ?? 'prepaye';
  const modeAfter = after.modePrincipal ?? 'prepaye';
  const nomBefore = before.nomPrincipal?.trim() || NOM_PRINCIPAL;
  const nomAfter = after.nomPrincipal?.trim() || NOM_PRINCIPAL;
  if (modeBefore !== modeAfter || nomBefore !== nomAfter) {
    ops.push({ resource: 'compteurs', id: PRINCIPAL_ID, body: compteurBody(PRINCIPAL_ID, nomAfter, modeAfter) });
  }
  if (!same(parametresBody(before), parametresBody(after))) {
    ops.push({ resource: 'parametres', id: '1', body: parametresBody(after) });
  }
  return ops;
}

/** Ordre d'envoi : un compteur doit exister avant ses achats/relevés et avant d'être « actif » ; les suppressions passent en dernier. */
export function phase(op: Op): number {
  if (op.deleted) return op.resource === 'compteurs' ? 5 : 4;
  switch (op.resource) {
    case 'compteurs':
      return 1;
    case 'achats':
    case 'releves':
      return 2;
    default:
      return 3;
  }
}

export const sortOps = (ops: readonly Op[]): Op[] =>
  ops.map((op, i) => ({ op, i })).sort((a, b) => phase(a.op) - phase(b.op) || a.i - b.i).map((x) => x.op);

/** Ajoute `incoming` à `existing` : une opération plus récente sur la même ressource remplace l'ancienne. */
export function coalesce(existing: readonly Op[], incoming: readonly Op[]): Op[] {
  const replaced = new Set(incoming.map(opKey));
  return [...existing.filter((op) => !replaced.has(opKey(op))), ...incoming];
}

/* ---------- Instantané serveur et cache local ---------- */

export interface Snapshot {
  compteurs: Record<string, Body>;
  achats: Record<string, Body>;
  releves: Record<string, Body>;
  parametres: Body | null;
}

export const emptySnapshot = (): Snapshot => ({ compteurs: {}, achats: {}, releves: {}, parametres: null });

/** Superpose les opérations en attente à l'état serveur : c'est l'état que l'utilisateur doit voir. */
export function applyOps(snapshot: Snapshot, ops: readonly Op[]): Snapshot {
  const out: Snapshot = {
    compteurs: { ...snapshot.compteurs },
    achats: { ...snapshot.achats },
    releves: { ...snapshot.releves },
    parametres: snapshot.parametres,
  };
  for (const op of ops) {
    if (op.resource === 'parametres') {
      out.parametres = op.deleted ? null : (op.body ?? null);
      continue;
    }
    const target = out[op.resource];
    if (op.deleted) {
      delete target[op.id];
      if (op.resource === 'compteurs') {
        const iri = compteurIri(op.id);
        for (const key of ['achats', 'releves'] as const) {
          for (const [id, b] of Object.entries(out[key])) if (b.compteur === iri) delete out[key][id];
        }
      }
    } else if (op.body) {
      target[op.id] = op.body;
    }
  }
  return out;
}

const idFromIri = (iri: unknown): string | undefined => (typeof iri === 'string' ? iri.split('/').pop() : undefined);

export interface Cache {
  settings: AppSettings;
  /** Données par id de compteur (`principal` inclus). */
  data: Record<string, AppData>;
}

export function snapshotToCache(snap: Snapshot): Cache {
  const p = snap.parametres;
  const settings: AppSettings = {};
  const compteurs: Compteur[] = Object.values(snap.compteurs)
    .filter((c) => c.id !== PRINCIPAL_ID)
    .map((c) => ({ id: String(c.id), nom: String(c.nom), mode: c.mode === 'postpaye' ? 'postpaye' : 'prepaye' }));
  if (compteurs.length > 0) settings.compteurs = compteurs;

  const principalNom = snap.compteurs[PRINCIPAL_ID]?.nom;
  if (typeof principalNom === 'string' && principalNom.trim() && principalNom !== NOM_PRINCIPAL) {
    settings.nomPrincipal = principalNom;
  }
  const principalMode = snap.compteurs[PRINCIPAL_ID]?.mode;
  const modePrincipal = (p?.modePrincipal ?? principalMode) as CompteurMode | undefined;
  if (modePrincipal) settings.modePrincipal = modePrincipal;

  if (p) {
    if (typeof p.budgetMensuelAr === 'number') settings.budgetMensuelAr = p.budgetMensuelAr;
    if (typeof p.objectifKwhMois === 'number') settings.objectifKwhMois = p.objectifKwhMois;
    if (p.uniteAffichage === 'ar' || p.uniteAffichage === 'kar') settings.uniteAffichage = p.uniteAffichage;
    if (p.arrondiMontant === 'entier' || p.arrondiMontant === 'decimales') settings.arrondiMontant = p.arrondiMontant;
    if (p.periodeGraphiques === '7' || p.periodeGraphiques === '30' || p.periodeGraphiques === '90' || p.periodeGraphiques === 'tout') {
      settings.periodeGraphiques = p.periodeGraphiques;
    }
    if (p.evenementsParMois && typeof p.evenementsParMois === 'object') {
      settings.evenementsParMois = p.evenementsParMois as Record<string, string>;
    }
    const actif = idFromIri(p.compteurActif);
    if (actif && actif !== PRINCIPAL_ID && snap.compteurs[actif]) settings.compteurActifId = actif;
  }

  const data: Record<string, AppData> = { [PRINCIPAL_ID]: { achats: [], releves: [] } };
  for (const id of Object.keys(snap.compteurs)) data[id] = { achats: [], releves: [] };

  for (const b of Object.values(snap.achats)) {
    const cid = idFromIri(b.compteur);
    if (cid && data[cid]) {
      data[cid].achats.push({
        id: String(b.id),
        date: String(b.date),
        montantAr: Number(b.montantAr),
        creditKwh: Number(b.creditKwh),
        prixUnitaireArPerKwh: Number(b.prixUnitaireArPerKwh),
      });
    }
  }
  for (const b of Object.values(snap.releves)) {
    const cid = idFromIri(b.compteur);
    if (cid && data[cid]) {
      data[cid].releves.push({
        id: String(b.id),
        date: String(b.date),
        creditRestantKwh: Number(b.creditRestantKwh),
        ...(b.fromAchat ? { fromAchat: true } : {}),
      });
    }
  }
  const byDate = (x: { date: string }, y: { date: string }) => new Date(x.date).getTime() - new Date(y.date).getTime();
  for (const d of Object.values(data)) {
    d.achats.sort(byDate);
    d.releves.sort(byDate);
  }
  return { settings, data };
}

import { PRINCIPAL_ID, parametresBody, toApiDate, type Body } from './mapping';
import { loadData, loadDataForCompteur, loadSettings } from '../storage';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/** Email du compte auquel appartient le cache local (données + file d'attente). Absent = données d'avant la connexion. */
export const OWNER_KEY = 'electracker_cache_owner';

const SYNC_PREFIXES = [
  'electracker_data',
  'electracker_settings',
  'electracker_last_save',
  'electracker_outbox',
  'electracker_sync_meta',
];
const STASH_PREFIX = 'electracker_stash_';

export const LEGACY_STASH = 'legacy';

function liveKeys(storage: StorageLike): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && SYNC_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
  }
  return keys;
}

export function getOwner(storage: StorageLike = localStorage): string | null {
  return storage.getItem(OWNER_KEY);
}

export function setOwner(email: string, storage: StorageLike = localStorage): void {
  storage.setItem(OWNER_KEY, email);
}

/** Met de côté le cache courant (données, réglages, file d'attente) sous un nom, puis le vide. */
export function stashLive(name: string, storage: StorageLike = localStorage): void {
  const entries: Record<string, string> = {};
  for (const k of liveKeys(storage)) {
    const v = storage.getItem(k);
    if (v !== null) entries[k] = v;
    storage.removeItem(k);
  }
  if (Object.keys(entries).length > 0) storage.setItem(STASH_PREFIX + name, JSON.stringify(entries));
}

/** Copie (sans vider) le cache courant sous un nom : filet de sécurité avant d'écraser le cache par l'état serveur. */
export function copyLive(name: string, storage: StorageLike = localStorage): void {
  const entries: Record<string, string> = {};
  for (const k of liveKeys(storage)) {
    const v = storage.getItem(k);
    if (v !== null) entries[k] = v;
  }
  if (Object.keys(entries).length > 0) storage.setItem(STASH_PREFIX + name, JSON.stringify(entries));
}

/** Restaure un cache mis de côté. Renvoie false s'il n'y en avait pas. */
export function restoreStash(name: string, storage: StorageLike = localStorage): boolean {
  const raw = storage.getItem(STASH_PREFIX + name);
  if (!raw) return false;
  try {
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) storage.setItem(k, v);
  } finally {
    storage.removeItem(STASH_PREFIX + name);
  }
  return true;
}

/** Des données saisies avant la connexion (ancienne version, sans compte) sont-elles présentes ? */
export function hasLegacyData(storage: StorageLike = localStorage): boolean {
  for (const k of liveKeys(storage)) {
    if (!k.startsWith('electracker_data')) continue;
    try {
      const d = JSON.parse(storage.getItem(k) ?? '{}') as { achats?: unknown[]; releves?: unknown[] };
      if ((d.achats?.length ?? 0) > 0 || (d.releves?.length ?? 0) > 0) return true;
    } catch {
      /* ignoré */
    }
  }
  const s = storage.getItem('electracker_settings');
  try {
    return s ? ((JSON.parse(s) as { compteurs?: unknown[] }).compteurs?.length ?? 0) > 0 : false;
  } catch {
    return false;
  }
}

export interface ImportPayload {
  compteurs: {
    id: string;
    nom: string;
    mode: string;
    achats: Body[];
    releves: Body[];
  }[];
  parametres: Body;
}

export interface LegacyExport {
  payload: ImportPayload;
  /** Lignes écartées car invalides pour le serveur (montant ou crédit nul, nombre non fini...). */
  skipped: number;
}

const finite = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n);
const validDate = (iso: string): boolean => /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(iso);

/** Construit la charge utile de `POST /import` à partir des données locales d'avant la connexion. */
export function buildLegacyImport(): LegacyExport {
  const settings = loadSettings();
  let skipped = 0;

  const toCompteur = (id: string, nom: string, mode: string, data: ReturnType<typeof loadData>) => {
    const achats: Body[] = [];
    for (const a of data.achats) {
      if (validDate(toApiDate(a.date)) && finite(a.montantAr) && a.montantAr > 0 && finite(a.creditKwh) && a.creditKwh > 0 && finite(a.prixUnitaireArPerKwh) && a.prixUnitaireArPerKwh >= 0) {
        achats.push({
          id: a.id,
          date: toApiDate(a.date),
          montantAr: a.montantAr,
          creditKwh: a.creditKwh,
          prixUnitaireArPerKwh: a.prixUnitaireArPerKwh,
        });
      } else skipped++;
    }
    const releves: Body[] = [];
    for (const r of data.releves) {
      if (validDate(toApiDate(r.date)) && finite(r.creditRestantKwh)) {
        releves.push({ id: r.id, date: toApiDate(r.date), creditRestantKwh: r.creditRestantKwh, fromAchat: Boolean(r.fromAchat) });
      } else skipped++;
    }
    return { id, nom, mode, achats, releves };
  };

  const compteurs = [
    toCompteur(PRINCIPAL_ID, settings.nomPrincipal ?? 'Principal', settings.modePrincipal ?? 'prepaye', loadData()),
    ...(settings.compteurs ?? []).map((c) => toCompteur(c.id, c.nom, c.mode, loadDataForCompteur(c.id))),
  ];

  const body = parametresBody(settings);
  const { compteurActif, ...rest } = body;
  const compteurActifId = typeof compteurActif === 'string' ? compteurActif.split('/').pop() : null;
  return { payload: { compteurs, parametres: { ...rest, compteurActifId } }, skipped };
}

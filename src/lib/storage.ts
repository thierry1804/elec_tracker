import type { AppData, AppSettings, Compteur, CompteurMode } from '../types';

const STORAGE_KEY = 'electracker_data';
export const LAST_SAVE_KEY = 'electracker_last_save';
const SETTINGS_KEY = 'electracker_settings';

export const DATA_KEY = STORAGE_KEY;
export { SETTINGS_KEY };

/**
 * Observateur des écritures utilisateur (synchronisation serveur). Il reçoit l'état stocké avant l'écriture
 * et le nouvel état ; les écritures venant du serveur passent par les fonctions `*Raw` et ne sont pas observées.
 */
export type ChangeEvent =
  | { kind: 'data'; compteurId: string | undefined; before: AppData; after: AppData }
  | { kind: 'settings'; before: AppSettings; after: AppSettings };

let changeRecorder: ((event: ChangeEvent) => void) | null = null;

export function setChangeRecorder(recorder: ((event: ChangeEvent) => void) | null): void {
  changeRecorder = recorder;
}

function readStoredData(key: string): AppData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { achats: [], releves: [] };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      achats: Array.isArray(parsed.achats) ? parsed.achats : [],
      releves: Array.isArray(parsed.releves) ? parsed.releves : [],
    };
  } catch {
    return { achats: [], releves: [] };
  }
}

const defaultData: AppData = {
  achats: [],
  releves: [],
};

function normalizeDateStrToNoonIso(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  // Les dates ISO complètes (avec heure) sont laissées telles quelles.
  if (value.includes('T')) return value;
  // On suppose ici un format `YYYY-MM-DD`.
  const [yStr, mStr, dStr] = value.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return value;
  // On fixe une heure locale "midi" pour éviter les décalages UTC lors du tri/affichage.
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.toISOString();
}

function asCompteurMode(value: unknown): CompteurMode {
  return value === 'postpaye' ? 'postpaye' : 'prepaye';
}

export function loadData(): AppData {
  try {
    const settings = loadSettings();
    const migrerSoldeAchat = (settings.modePrincipal ?? 'prepaye') === 'prepaye';
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as AppData;
    const releves = Array.isArray(parsed.releves) ? parsed.releves : defaultData.releves;
    const achats = Array.isArray(parsed.achats) ? parsed.achats : defaultData.achats;

    // Normalisation : dates `YYYY-MM-DD` -> iso horaire cohérent (midi local).
    const relevesNorm = releves.map((r) => ({
      ...r,
      date: normalizeDateStrToNoonIso(r.date) as string,
    }));
    const achatsNorm = achats
      .map((a) => ({
        ...a,
        date: normalizeDateStrToNoonIso(a.date) as string,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const datesAchat = new Set(achatsNorm.map((a) => a.date));
    const relevesAvecOrigine = migrerSoldeAchat
      ? relevesNorm.map((r) => ({
          ...r,
          fromAchat: Boolean(r.fromAchat) || datesAchat.has(r.date),
        }))
      : relevesNorm;

    // Migration de cohérence solde:
    // pour chaque achat, le relevé "juste après" le dernier relevé <= date d'achat
    // doit avoir `creditRestantKwh = creditBase + creditKwh`.
    // Ceci corrige les cas anciens où le tri/les dates sans heure faisaient choisir
    // une mauvaise base (d'où le 60,83 vs 64,9).
    const relevesSorted = [...relevesAvecOrigine].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (migrerSoldeAchat) {
      for (const achat of achatsNorm) {
        const achatTimeMs = new Date(achat.date).getTime();
        let baseIndex = -1;
        for (let i = 0; i < relevesSorted.length; i++) {
          const t = new Date(relevesSorted[i].date).getTime();
          if (t <= achatTimeMs) baseIndex = i;
          else break;
        }

        if (baseIndex < 0) continue;
        const targetIndex = baseIndex + 1;
        if (targetIndex >= relevesSorted.length) continue;

        const creditBase = relevesSorted[baseIndex].creditRestantKwh;
        const expected = creditBase + achat.creditKwh;
        const current = relevesSorted[targetIndex].creditRestantKwh;
        // On évite d'écraser une saisie utilisateur postérieure (qui aurait plutôt un solde inférieur).
        // La correction visée correspond à des crédits synthétiques "trop élevés".
        const TOLERANCE_KWH = 0.01;
        if (current - expected > TOLERANCE_KWH) {
          relevesSorted[targetIndex].creditRestantKwh = expected;
        }
      }
    }

    return { achats: achatsNorm, releves: relevesSorted };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
  changeRecorder?.({ kind: 'data', compteurId: undefined, before: readStoredData(STORAGE_KEY), after: data });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(LAST_SAVE_KEY, new Date().toISOString());
}

export function getLastSaveTime(): string | null {
  return localStorage.getItem(LAST_SAVE_KEY);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: AppSettings = {};
    if (typeof parsed.budgetMensuelAr === 'number' && parsed.budgetMensuelAr >= 0) {
      out.budgetMensuelAr = parsed.budgetMensuelAr;
    }
    if (typeof parsed.objectifKwhMois === 'number' && parsed.objectifKwhMois >= 0) {
      out.objectifKwhMois = parsed.objectifKwhMois;
    }
    if (parsed.uniteAffichage === 'ar' || parsed.uniteAffichage === 'kar') {
      out.uniteAffichage = parsed.uniteAffichage;
    }
    if (parsed.arrondiMontant === 'entier' || parsed.arrondiMontant === 'decimales') {
      out.arrondiMontant = parsed.arrondiMontant;
    }
    if (parsed.periodeGraphiques === '7' || parsed.periodeGraphiques === '30' || parsed.periodeGraphiques === '90' || parsed.periodeGraphiques === 'tout') {
      out.periodeGraphiques = parsed.periodeGraphiques;
    }
    if (parsed.evenementsParMois && typeof parsed.evenementsParMois === 'object' && !Array.isArray(parsed.evenementsParMois)) {
      const obj: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.evenementsParMois as Record<string, unknown>)) {
        if (typeof v === 'string') obj[k] = v;
      }
      if (Object.keys(obj).length > 0) out.evenementsParMois = obj;
    }
    if (Array.isArray(parsed.compteurs)) {
      const compteurs: Compteur[] = [];
      for (const raw of parsed.compteurs) {
        if (!raw || typeof raw !== 'object') continue;
        const c = raw as Record<string, unknown>;
        if (typeof c.id !== 'string' || typeof c.nom !== 'string') continue;
        compteurs.push({ id: c.id, nom: c.nom, mode: asCompteurMode(c.mode) });
      }
      out.compteurs = compteurs;
    }
    if (typeof parsed.compteurActifId === 'string') {
      out.compteurActifId = parsed.compteurActifId;
    }
    if (parsed.modePrincipal === 'prepaye' || parsed.modePrincipal === 'postpaye') {
      out.modePrincipal = parsed.modePrincipal;
    }
    if (typeof parsed.nomPrincipal === 'string' && parsed.nomPrincipal.trim()) {
      out.nomPrincipal = parsed.nomPrincipal.trim().slice(0, 120);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  changeRecorder?.({ kind: 'settings', before: loadSettings(), after: settings });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Écriture venant du serveur : non observée, ne génère aucune opération à renvoyer. */
export function saveSettingsRaw(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function saveDataRaw(compteurId: string | undefined, data: AppData): void {
  localStorage.setItem(compteurId ? compteurStorageKey(compteurId) : STORAGE_KEY, JSON.stringify(data));
}

/** Clé de stockage propre à un compteur. */
export function compteurStorageKey(compteurId: string): string {
  return `${STORAGE_KEY}_${compteurId}`;
}

function compteurLastSaveKey(compteurId: string): string {
  return `${LAST_SAVE_KEY}_${compteurId}`;
}

/**
 * Charge les données du compteur spécifié (ou principal si pas d'ID).
 */
export function loadDataForCompteur(compteurId?: string): AppData {
  if (!compteurId) return loadData();
  try {
    const raw = localStorage.getItem(compteurStorageKey(compteurId));
    if (!raw) return { achats: [], releves: [] };
    // Réutilise la même logique de parsing (simplifié : pas de migration ici)
    const parsed = JSON.parse(raw) as AppData;
    return {
      releves: Array.isArray(parsed.releves) ? parsed.releves : [],
      achats: Array.isArray(parsed.achats) ? parsed.achats : [],
    };
  } catch {
    return { achats: [], releves: [] };
  }
}

export function saveDataForCompteur(compteurId: string, data: AppData): void {
  changeRecorder?.({ kind: 'data', compteurId, before: readStoredData(compteurStorageKey(compteurId)), after: data });
  localStorage.setItem(compteurStorageKey(compteurId), JSON.stringify(data));
  localStorage.setItem(compteurLastSaveKey(compteurId), new Date().toISOString());
}

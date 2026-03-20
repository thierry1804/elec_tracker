import type { AppData, AppSettings } from '../types';

const STORAGE_KEY = 'electracker_data';
export const LAST_SAVE_KEY = 'electracker_last_save';
const SETTINGS_KEY = 'electracker_settings';

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

export function loadData(): AppData {
  try {
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
    const relevesAvecOrigine = relevesNorm.map((r) => ({
      ...r,
      fromAchat: Boolean(r.fromAchat) || datesAchat.has(r.date),
    }));

    // Migration de cohérence solde:
    // pour chaque achat, le relevé "juste après" le dernier relevé <= date d'achat
    // doit avoir `creditRestantKwh = creditBase + creditKwh`.
    // Ceci corrige les cas anciens où le tri/les dates sans heure faisaient choisir
    // une mauvaise base (d'où le 60,83 vs 64,9).
    const relevesSorted = [...relevesAvecOrigine].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

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

    return { achats: achatsNorm, releves: relevesSorted };
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: AppData): void {
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
    return out;
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

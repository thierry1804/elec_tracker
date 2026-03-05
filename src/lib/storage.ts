import type { AppData, AppSettings } from '../types';

const STORAGE_KEY = 'electracker_data';
export const LAST_SAVE_KEY = 'electracker_last_save';
const SETTINGS_KEY = 'electracker_settings';

const defaultData: AppData = {
  achats: [],
  releves: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as AppData;
    return {
      achats: Array.isArray(parsed.achats) ? parsed.achats : defaultData.achats,
      releves: Array.isArray(parsed.releves) ? parsed.releves : defaultData.releves,
    };
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
    return out;
  } catch {
    return {};
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

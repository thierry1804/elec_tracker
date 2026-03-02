import type { AppData } from '../types';

const STORAGE_KEY = 'electracker_data';

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
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

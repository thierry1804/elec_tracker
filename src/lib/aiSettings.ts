import type { AiSettings } from '../types';

const STORAGE_KEY = 'electracker_ai_settings';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export function loadAiSettings(): AiSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiSettings;
    if (!parsed.apiKey || typeof parsed.apiKey !== 'string') return null;
    return {
      apiKey: parsed.apiKey.trim(),
      baseUrl: parsed.baseUrl?.trim() || DEFAULT_BASE_URL,
      model: parsed.model?.trim() || DEFAULT_MODEL,
    };
  } catch {
    return null;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAiSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_BASE_URL, DEFAULT_MODEL };

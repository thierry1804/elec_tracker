import type { EmbeddedAiSettings, ModelTier } from '../../types';
import { DEFAULT_MODEL_TIER } from './models';

const STORAGE_KEY = 'electracker_embedded_ai_settings';
const LEGACY_STORAGE_KEY = 'electracker_ai_settings';

const DEFAULT_SETTINGS: EmbeddedAiSettings = {
  enabled: false,
  modelTier: DEFAULT_MODEL_TIER,
};

export function loadEmbeddedAiSettings(): EmbeddedAiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EmbeddedAiSettings>;
      return {
        enabled: parsed.enabled === true,
        modelTier: parsed.modelTier === 'balanced' ? 'balanced' : 'light',
        downloadedAt: parsed.downloadedAt,
      };
    }
    migrateLegacyApiSettings();
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Supprime l’ancienne config clé API si présente. */
function migrateLegacyApiSettings(): void {
  try {
    if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function saveEmbeddedAiSettings(settings: EmbeddedAiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function updateEmbeddedAiSettings(
  patch: Partial<EmbeddedAiSettings>
): EmbeddedAiSettings {
  const current = loadEmbeddedAiSettings();
  const next: EmbeddedAiSettings = {
    ...current,
    ...patch,
    modelTier: patch.modelTier === 'balanced' ? 'balanced' : patch.modelTier ?? current.modelTier,
  };
  saveEmbeddedAiSettings(next);
  return next;
}

export function setModelTier(tier: ModelTier): EmbeddedAiSettings {
  return updateEmbeddedAiSettings({ modelTier: tier, downloadedAt: undefined });
}

export { DEFAULT_SETTINGS };

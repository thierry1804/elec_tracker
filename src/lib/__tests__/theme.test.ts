import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getEffectiveTheme, isNightHour, normalizeTheme, NIGHT_END_HOUR, NIGHT_START_HOUR } from '../theme';

const at = (hour: number, minute = 0) => new Date(2026, 10, 28, hour, minute);

describe('isNightHour', () => {
  it('est sombre de 18 h inclus à 6 h exclu', () => {
    expect(isNightHour(at(NIGHT_START_HOUR))).toBe(true);
    expect(isNightHour(at(17, 59))).toBe(false);
    expect(isNightHour(at(23))).toBe(true);
    expect(isNightHour(at(0))).toBe(true);
    expect(isNightHour(at(5, 59))).toBe(true);
    expect(isNightHour(at(NIGHT_END_HOUR))).toBe(false);
    expect(isNightHour(at(12))).toBe(false);
  });
});

describe('normalizeTheme', () => {
  it('convertit l’ancien réglage « system » en auto', () => {
    expect(normalizeTheme('system')).toBe('auto');
  });

  it('garde les valeurs valides et rejette le reste', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('auto')).toBe('auto');
    expect(normalizeTheme('autre')).toBeNull();
    expect(normalizeTheme(null)).toBeNull();
  });
});

describe('getEffectiveTheme', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('suit l’heure par défaut (aucun réglage enregistré)', () => {
    expect(getEffectiveTheme(at(21))).toBe('dark');
    expect(getEffectiveTheme(at(14))).toBe('light');
  });

  it('suit l’heure en mode auto, y compris pour l’ancien « system »', () => {
    store.set('electracker_theme', 'auto');
    expect(getEffectiveTheme(at(2))).toBe('dark');
    store.set('electracker_theme', 'system');
    expect(getEffectiveTheme(at(9))).toBe('light');
  });

  it('respecte le choix manuel, de jour comme de nuit', () => {
    store.set('electracker_theme', 'light');
    expect(getEffectiveTheme(at(23))).toBe('light');
    store.set('electracker_theme', 'dark');
    expect(getEffectiveTheme(at(12))).toBe('dark');
  });
});

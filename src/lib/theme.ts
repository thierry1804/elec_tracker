const THEME_KEY = 'electracker_theme';

/** `auto` : sombre la nuit (heure locale), clair le jour. Défaut pour un nouvel utilisateur. */
export type Theme = 'light' | 'dark' | 'auto';

export type ResolvedTheme = 'light' | 'dark';

/** Début et fin de la nuit, heure locale : sombre de 18 h inclus à 6 h exclu. */
export const NIGHT_START_HOUR = 18;
export const NIGHT_END_HOUR = 6;

export function isNightHour(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

/** Ancien réglage « system » (suivre l'appareil) : remplacé par `auto`. */
export function normalizeTheme(raw: string | null): Theme | null {
  if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  if (raw === 'system') return 'auto';
  return null;
}

export function getStoredTheme(): Theme | null {
  return normalizeTheme(localStorage.getItem(THEME_KEY));
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyStoredTheme();
}

export function getEffectiveTheme(date: Date = new Date()): ResolvedTheme {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  return isNightHour(date) ? 'dark' : 'light';
}

function applyStoredTheme(): void {
  document.documentElement.setAttribute('data-theme', getEffectiveTheme());
}

export function initTheme(): void {
  applyStoredTheme();
}

/** En mode auto, le thème suit l'heure : réévalué chaque minute et au retour sur l'onglet. */
export function subscribeToThemeChanges(): () => void {
  if (typeof window === 'undefined') return () => {};
  const refresh = () => {
    const stored = getStoredTheme();
    if (stored !== 'light' && stored !== 'dark') applyStoredTheme();
  };
  const interval = window.setInterval(refresh, 60_000);
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

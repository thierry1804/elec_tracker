const THEME_KEY = 'electracker_theme';

export type Theme = 'light' | 'dark' | 'system';

export type ResolvedTheme = 'light' | 'dark';

export function getStoredTheme(): Theme | null {
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return null;
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyStoredTheme();
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getEffectiveTheme(): ResolvedTheme {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemTheme();
}

function applyStoredTheme(): void {
  document.documentElement.setAttribute('data-theme', getEffectiveTheme());
}

export function initTheme(): void {
  applyStoredTheme();
}

export function subscribeToSystemTheme(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getStoredTheme() === 'system') applyStoredTheme();
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

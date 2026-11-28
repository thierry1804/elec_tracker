import type { AppSettings } from '../types';

const LOCALE = 'fr-FR';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
    formatters.set(key, f);
  }
  return f;
}

/** Nombre à décimales fixes, virgule française : 2,70. Source unique du format des valeurs affichées. */
export function formatNombre(value: number, decimals = 2): string {
  return formatter(decimals, decimals).format(value);
}

/** Nombre sans zéros inutiles (jusqu'à `maxDecimals`) : 17,6 ou 9. */
export function formatNombreSouple(value: number, maxDecimals = 2): string {
  return formatter(0, maxDecimals).format(value);
}

/** Durée entre deux relevés : « 23,4 h » sous un jour, sinon « 1,4 j ». */
export function formatDuree(nbJours: number): string {
  return nbJours < 1
    ? `${formatNombre(nbJours * 24, 1)} h`
    : `${Number.isInteger(nbJours) ? nbJours : formatNombre(nbJours, 1)} j`;
}

/**
 * Formate un montant en Ar selon les préférences (unité Ar/kAr, arrondi).
 */
export function formatMontant(ar: number, settings?: AppSettings): string {
  const unite = settings?.uniteAffichage ?? 'ar';
  const arrondi = settings?.arrondiMontant ?? 'entier';
  const value = arrondi === 'entier' ? Math.round(ar) : Math.round(ar * 100) / 100;
  if (unite === 'kar') {
    const k = value / 1000;
    return arrondi === 'entier' ? `${Math.round(k)} kAr` : `${formatNombre(k, 2)} kAr`;
  }
  return `${value.toLocaleString(LOCALE)} Ar`;
}

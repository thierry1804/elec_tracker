import type { AppSettings } from '../types';

/**
 * Formate un montant en Ar selon les préférences (unité Ar/kAr, arrondi).
 */
export function formatMontant(ar: number, settings?: AppSettings): string {
  const unite = settings?.uniteAffichage ?? 'ar';
  const arrondi = settings?.arrondiMontant ?? 'entier';
  const value = arrondi === 'entier' ? Math.round(ar) : Math.round(ar * 100) / 100;
  if (unite === 'kar') {
    const k = value / 1000;
    return arrondi === 'entier' ? `${Math.round(k)} kAr` : `${k.toFixed(2).replace('.', ',')} kAr`;
  }
  return `${value.toLocaleString('fr-FR')} Ar`;
}

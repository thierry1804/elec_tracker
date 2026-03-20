import type { Achat } from '../types';

export interface PalierDetecte {
  seuilKwh: number;
  prixArPerKwh: number;
}

export interface AnalysePaliers {
  paliers: PalierDetecte[];
  message: string;
}

/**
 * Détecte les paliers tarifaires JIRAMA à partir de l'historique des achats.
 * On cherche des clusters de prix unitaires distincts corrélés à la quantité achetée.
 * Retourne null si pas assez de données ou si un seul palier est détecté.
 */
export function detecterPaliersJirama(achats: Achat[]): AnalysePaliers | null {
  if (achats.length < 3) return null;

  // Regrouper les prix unitaires en clusters (tolérance de 5%)
  const prixList = achats
    .map((a) => ({ prix: a.prixUnitaireArPerKwh, kwh: a.creditKwh }))
    .filter((p) => p.prix > 0 && p.kwh > 0)
    .sort((a, b) => a.prix - b.prix);

  if (prixList.length < 3) return null;

  // K-means simplifié : on cherche 2 ou 3 clusters de prix
  const allPrix = prixList.map((p) => p.prix);
  const min = allPrix[0];
  const max = allPrix[allPrix.length - 1];

  // Si l'écart max-min < 10%, un seul palier
  if ((max - min) / min < 0.10) return null;

  // Séparation en 2 clusters par l'écart maximal entre prix consécutifs triés
  let maxGap = 0;
  let splitIdx = 0;
  for (let i = 1; i < allPrix.length; i++) {
    const gap = allPrix[i] - allPrix[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      splitIdx = i;
    }
  }

  // Pas de séparation significative
  if (maxGap / min < 0.08) return null;

  const cluster1 = prixList.slice(0, splitIdx);
  const cluster2 = prixList.slice(splitIdx);

  if (cluster1.length === 0 || cluster2.length === 0) return null;

  const avgPrix1 = cluster1.reduce((s, p) => s + p.prix, 0) / cluster1.length;
  const avgPrix2 = cluster2.reduce((s, p) => s + p.prix, 0) / cluster2.length;
  const avgKwh1 = cluster1.reduce((s, p) => s + p.kwh, 0) / cluster1.length;
  const avgKwh2 = cluster2.reduce((s, p) => s + p.kwh, 0) / cluster2.length;

  // Le palier à prix bas correspond généralement aux petites quantités (tranche 1)
  const paliers: PalierDetecte[] = [
    {
      seuilKwh: Math.round(Math.min(avgKwh1, avgKwh2)),
      prixArPerKwh: Math.round(Math.min(avgPrix1, avgPrix2) * 100) / 100,
    },
    {
      seuilKwh: Math.round(Math.max(avgKwh1, avgKwh2)),
      prixArPerKwh: Math.round(Math.max(avgPrix1, avgPrix2) * 100) / 100,
    },
  ];

  const message = paliers
    .map((p, i) =>
      i === 0
        ? `Tranche 1 (≤ ~${p.seuilKwh} kWh) : ~${p.prixArPerKwh} Ar/kWh`
        : `Tranche 2 (> ~${paliers[0].seuilKwh} kWh) : ~${p.prixArPerKwh} Ar/kWh`
    )
    .join(' · ');

  return { paliers, message };
}

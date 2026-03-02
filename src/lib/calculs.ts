import type { Achat, Releve } from '../types';

const JOURS_MARGE_ACHAT = 3;
const SEUIL_KWH_ALERTE = 20;
const SEUIL_JOURS_ALERTE = 7;

export interface ConsoEntreReleves {
  dateDebut: string;
  dateFin: string;
  kwhAvant: number;
  kwhApres: number;
  kwhConsommes: number;
  nbJours: number;
  tauxJournalier: number;
}

export function getRelevesTries(releves: Releve[]): Releve[] {
  return [...releves].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

export function getConsommationsEntreReleves(releves: Releve[]): ConsoEntreReleves[] {
  const tries = getRelevesTries(releves);
  const result: ConsoEntreReleves[] = [];
  for (let i = 1; i < tries.length; i++) {
    const prev = tries[i - 1];
    const curr = tries[i];
    const kwhConsommes = prev.creditRestantKwh - curr.creditRestantKwh;
    const dateDebut = new Date(prev.date);
    const dateFin = new Date(curr.date);
    const nbJours = Math.max(1, Math.round((dateFin.getTime() - dateDebut.getTime()) / (24 * 60 * 60 * 1000)));
    const tauxJournalier = kwhConsommes / nbJours;
    result.push({
      dateDebut: prev.date,
      dateFin: curr.date,
      kwhAvant: prev.creditRestantKwh,
      kwhApres: curr.creditRestantKwh,
      kwhConsommes,
      nbJours,
      tauxJournalier,
    });
  }
  return result;
}

export function getPrixMoyenArPerKwh(achats: Achat[]): number | null {
  if (achats.length === 0) return null;
  const total = achats.reduce((s, a) => s + a.prixUnitaireArPerKwh, 0);
  return total / achats.length;
}

export function getTauxJournalierRecent(releves: Releve[], nbJours = 7): number | null {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length === 0) return null;
  const now = Date.now();
  const limit = now - nbJours * 24 * 60 * 60 * 1000;
  const recent = consos.filter((c) => new Date(c.dateFin).getTime() >= limit);
  if (recent.length === 0) return consos[consos.length - 1].tauxJournalier;
  const totalKwh = recent.reduce((s, c) => s + c.kwhConsommes, 0);
  const totalJours = recent.reduce((s, c) => s + c.nbJours, 0);
  return totalJours > 0 ? totalKwh / totalJours : null;
}

const POIDS_SEMAINE = 0.6;
const POIDS_MOIS = 0.3;
const POIDS_GLOBAL = 0.1;

function getTauxSurPeriode(consos: ConsoEntreReleves[], nbJours: number): number | null {
  if (consos.length === 0) return null;
  const now = Date.now();
  const limit = now - nbJours * 24 * 60 * 60 * 1000;
  const period = consos.filter((c) => new Date(c.dateFin).getTime() >= limit);
  if (period.length === 0) return null;
  const totalKwh = period.reduce((s, c) => s + c.kwhConsommes, 0);
  const totalJours = period.reduce((s, c) => s + c.nbJours, 0);
  return totalJours > 0 ? totalKwh / totalJours : null;
}

/**
 * Taux journalier moyen pondéré : 7 derniers jours (0.6) + 30 derniers jours (0.3) + global (0.1).
 * Repli sur les périodes disponibles si pas assez de données.
 */
export function getTauxJournalierPondere(releves: Releve[]): number | null {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length === 0) return null;
  const taux7 = getTauxSurPeriode(consos, 7);
  const taux30 = getTauxSurPeriode(consos, 30);
  const totalKwh = consos.reduce((s, c) => s + c.kwhConsommes, 0);
  const totalJours = consos.reduce((s, c) => s + c.nbJours, 0);
  const tauxGlobal = totalJours > 0 ? totalKwh / totalJours : null;

  const parts: { poids: number; taux: number }[] = [];
  if (taux7 != null) parts.push({ poids: POIDS_SEMAINE, taux: taux7 });
  if (taux30 != null) parts.push({ poids: POIDS_MOIS, taux: taux30 });
  if (tauxGlobal != null) parts.push({ poids: POIDS_GLOBAL, taux: tauxGlobal });
  if (parts.length === 0) return null;
  const totalPoids = parts.reduce((s, p) => s + p.poids, 0);
  return parts.reduce((s, p) => s + (p.poids / totalPoids) * p.taux, 0);
}

/**
 * Régression linéaire : taux_journalier en fonction du temps (jours depuis premier relevé).
 * Retourne la pente (kWh/j par jour) ou 0 si pas assez de points.
 */
export function getTendanceConso(releves: Releve[]): number {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length < 2) return 0;
  const tries = getRelevesTries(releves);
  const firstTime = new Date(tries[0].date).getTime();
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  const n = consos.length;
  for (let i = 0; i < n; i++) {
    const x = (new Date(consos[i].dateFin).getTime() - firstTime) / (24 * 60 * 60 * 1000);
    const y = consos[i].tauxJournalier;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Taux de prédiction = moyenne pondérée × coefficient tendance.
 * Coefficient tendance = 1 + (pente × 7 jours / taux_moyen) pour une évolution par semaine, plafonné à [0.85, 1.15].
 */
export function getTauxJournalierPrediction(releves: Releve[]): number | null {
  const tauxPondere = getTauxJournalierPondere(releves);
  if (tauxPondere == null || tauxPondere <= 0) return null;
  const pente = getTendanceConso(releves);
  const variationParSemaine = (pente * 7) / tauxPondere;
  const coefficientTendance = Math.max(0.85, Math.min(1.15, 1 + variationParSemaine));
  return tauxPondere * coefficientTendance;
}

/** Marge relative pour l'intervalle de confiance (écart-type des taux ou 15 % par défaut). */
export function getMargeIntervalleConfiance(releves: Releve[]): number {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length < 2) return 0.15;
  const tauxPondere = getTauxJournalierPondere(releves) ?? 0;
  if (tauxPondere <= 0) return 0.15;
  const mean = consos.reduce((s, c) => s + c.tauxJournalier, 0) / consos.length;
  const variance =
    consos.reduce((s, c) => s + (c.tauxJournalier - mean) ** 2, 0) / consos.length;
  const std = Math.sqrt(variance);
  const marge = std / tauxPondere;
  return Math.min(0.35, Math.max(0.08, marge));
}

/**
 * Date d'épuisement estimée à partir de la date de référence (date du dernier relevé)
 * et du solde à cette date. Doit utiliser la même référence que la courbe de prévision.
 */
export function getDateEpuisementEstimee(
  kwhRestants: number,
  tauxJournalier: number,
  dateDernierReleve: string
): Date | null {
  if (tauxJournalier <= 0) return null;
  const d = new Date(dateDernierReleve);
  d.setHours(0, 0, 0, 0);
  const jours = kwhRestants / tauxJournalier;
  d.setDate(d.getDate() + Math.floor(jours));
  return d;
}

export function getJoursRestants(dateEpuisement: Date | null): number | null {
  if (!dateEpuisement) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ep = new Date(dateEpuisement);
  ep.setHours(0, 0, 0, 0);
  const diff = Math.round((ep.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export function getProchainAchatSuggere(dateEpuisement: Date | null): Date | null {
  if (!dateEpuisement) return null;
  const d = new Date(dateEpuisement);
  d.setDate(d.getDate() - JOURS_MARGE_ACHAT);
  return d;
}

export function getCoutMensuelEstime(tauxJournalier: number, prixMoyenArPerKwh: number): number {
  const kwhMois = tauxJournalier * 30;
  return Math.round(kwhMois * prixMoyenArPerKwh);
}

export function isAlerteCreditFaible(kwhRestants: number, joursRestants: number | null): boolean {
  if (kwhRestants < SEUIL_KWH_ALERTE) return true;
  if (joursRestants !== null && joursRestants < SEUIL_JOURS_ALERTE) return true;
  return false;
}

export function getDonneesGraphiqueSolde(releves: Releve[]): { date: string; solde: number }[] {
  return getRelevesTries(releves).map((r) => ({
    date: r.date,
    solde: r.creditRestantKwh,
  }));
}

/**
 * Retourne les points de la courbe de prévision d'épuisement (taux pondéré × tendance).
 */
export function getDonneesPrevisionSolde(
  releves: Releve[]
): { date: string; solde: number }[] {
  const tries = getRelevesTries(releves);
  if (tries.length === 0) return [];
  const taux = getTauxJournalierPrediction(releves);
  if (taux == null || taux <= 0) return [];
  const dernier = tries[tries.length - 1];
  const result: { date: string; solde: number }[] = [];
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  let date = new Date(dernier.date);
  date.setDate(date.getDate() + 1);
  let solde = Math.max(0, dernier.creditRestantKwh - taux);
  while (solde > 0.01) {
    result.push({ date: toIso(date), solde });
    date.setDate(date.getDate() + 1);
    solde -= taux;
  }
  result.push({ date: toIso(date), solde: 0 });
  return result;
}

/**
 * Retourne la prévision avec intervalle de confiance (min/max) pour la bande grisée.
 */
export function getDonneesPrevisionAvecIntervalle(
  releves: Releve[]
): { date: string; solde: number; soldeMin: number; soldeMax: number }[] {
  const tries = getRelevesTries(releves);
  if (tries.length === 0) return [];
  const taux = getTauxJournalierPrediction(releves);
  if (taux == null || taux <= 0) return [];
  const marge = getMargeIntervalleConfiance(releves);
  const tauxMin = taux * (1 - marge);
  const tauxMax = taux * (1 + marge);
  const dernier = tries[tries.length - 1];
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const result: { date: string; solde: number; soldeMin: number; soldeMax: number }[] = [];
  let date = new Date(dernier.date);
  date.setDate(date.getDate() + 1);
  let solde = Math.max(0, dernier.creditRestantKwh - taux);
  let soldeMin = Math.max(0, dernier.creditRestantKwh - tauxMax);
  let soldeMax = Math.max(0, dernier.creditRestantKwh - tauxMin);
  while (solde > 0.01 || soldeMax > 0.01) {
    result.push({
      date: toIso(date),
      solde: Math.max(0, solde),
      soldeMin: Math.max(0, soldeMin),
      soldeMax: Math.max(0, soldeMax),
    });
    date.setDate(date.getDate() + 1);
    solde -= taux;
    soldeMin -= tauxMax;
    soldeMax -= tauxMin;
  }
  result.push({ date: toIso(date), solde: 0, soldeMin: 0, soldeMax: 0 });
  return result;
}

export function getDonneesGraphiqueConso(releves: Releve[]): { label: string; conso: number }[] {
  return getConsommationsEntreReleves(releves).map((c) => ({
    label: new Date(c.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    conso: Math.round(c.kwhConsommes * 100) / 100,
  }));
}

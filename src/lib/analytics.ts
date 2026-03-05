import type { Achat, Releve } from '../types';
import {
  getConsommationsEntreReleves,
  getTauxJournalierPondere,
  getPrixMoyenArPerKwh,
  getCoutMensuelEstime,
} from './calculs';

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Mois au format YYYY-MM pour clé */
function getMoisKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Répartition des kWh d'un intervalle de conso par mois (au prorata des jours). */
function repartirKwhParMois(
  dateDebut: string,
  dateFin: string,
  kwhConsommes: number
): Map<string, number> {
  const out = new Map<string, number>();
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  const totalMs = d2.getTime() - d1.getTime();
  if (totalMs <= 0) return out;
  let remaining = kwhConsommes;
  let cur = new Date(d1);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(d2);
  end.setHours(0, 0, 0, 0);
  while (cur.getTime() < end.getTime()) {
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const limit = nextMonth.getTime() < end.getTime() ? nextMonth : end;
    const msInSegment = limit.getTime() - cur.getTime();
    const pct = msInSegment / totalMs;
    const kwh = Math.round(kwhConsommes * pct * 100) / 100;
    const key = getMoisKey(cur);
    out.set(key, (out.get(key) ?? 0) + kwh);
    remaining -= kwh;
    cur = nextMonth;
  }
  if (remaining > 0.001) {
    const key = getMoisKey(end);
    out.set(key, (out.get(key) ?? 0) + remaining);
  }
  return out;
}

export interface KwhCoutParMois {
  mois: string;
  kwh: number;
  coutAr: number;
}

/**
 * Agrège kWh consommés et coût (achats) par mois calendaire.
 * kWh : répartition au prorata des consommations entre relevés.
 * Coût : somme des achats dont la date tombe dans le mois.
 */
export function getKwhEtCoutParMois(
  releves: Releve[],
  achats: Achat[]
): KwhCoutParMois[] {
  const consos = getConsommationsEntreReleves(releves);
  const kwhParMois = new Map<string, number>();
  for (const c of consos) {
    const rep = repartirKwhParMois(c.dateDebut, c.dateFin, c.kwhConsommes);
    for (const [mois, kwh] of rep) {
      kwhParMois.set(mois, (kwhParMois.get(mois) ?? 0) + kwh);
    }
  }
  const coutParMois = new Map<string, number>();
  for (const a of achats) {
    const mois = getMoisKey(new Date(a.date));
    coutParMois.set(mois, (coutParMois.get(mois) ?? 0) + a.montantAr);
  }
  const allMonths = new Set([...kwhParMois.keys(), ...coutParMois.keys()]);
  return [...allMonths]
    .sort()
    .map((mois) => ({
      mois,
      kwh: Math.round((kwhParMois.get(mois) ?? 0) * 100) / 100,
      coutAr: Math.round(coutParMois.get(mois) ?? 0),
    }));
}

export interface ComparaisonMois {
  kwhCeMois: number;
  kwhMoisDernier: number;
  evolutionKwhPct: number | null;
  coutCeMois: number;
  coutMoisDernier: number;
  evolutionCoutPct: number | null;
}

export function getComparaisonCeMoisVsDernier(
  releves: Releve[],
  achats: Achat[]
): ComparaisonMois | null {
  const parMois = getKwhEtCoutParMois(releves, achats);
  if (parMois.length < 2) return null;
  const now = new Date();
  const ceMois = getMoisKey(now);
  const moisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const moisDernier = getMoisKey(moisPrec);
  const dataCe = parMois.find((p) => p.mois === ceMois);
  const dataDernier = parMois.find((p) => p.mois === moisDernier);
  if (!dataCe && !dataDernier) return null;
  const kwhCeMois = dataCe?.kwh ?? 0;
  const kwhMoisDernier = dataDernier?.kwh ?? 0;
  const coutCeMois = dataCe?.coutAr ?? 0;
  const coutMoisDernier = dataDernier?.coutAr ?? 0;
  const evolutionKwhPct =
    kwhMoisDernier > 0
      ? Math.round(((kwhCeMois - kwhMoisDernier) / kwhMoisDernier) * 1000) / 10
      : null;
  const evolutionCoutPct =
    coutMoisDernier > 0
      ? Math.round(((coutCeMois - coutMoisDernier) / coutMoisDernier) * 1000) / 10
      : null;
  return {
    kwhCeMois,
    kwhMoisDernier,
    evolutionKwhPct,
    coutCeMois,
    coutMoisDernier,
    evolutionCoutPct,
  };
}

export interface PrixMoyenComparaison {
  prixCeMois: number | null;
  prixMoisDernier: number | null;
  evolutionPct: number | null;
}

export function getPrixMoyenParMois(achats: Achat[]): { mois: string; prixArPerKwh: number }[] {
  const parMois = new Map<string, number[]>();
  for (const a of achats) {
    const mois = getMoisKey(new Date(a.date));
    if (!parMois.has(mois)) parMois.set(mois, []);
    parMois.get(mois)!.push(a.prixUnitaireArPerKwh);
  }
  return [...parMois.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mois, prix]) => ({
      mois,
      prixArPerKwh: prix.reduce((s, p) => s + p, 0) / prix.length,
    }));
}

export function getComparaisonPrixMoyenCeMoisVsDernier(
  achats: Achat[]
): PrixMoyenComparaison | null {
  const parMois = getPrixMoyenParMois(achats);
  if (parMois.length < 2) return null;
  const now = new Date();
  const ceMois = getMoisKey(now);
  const moisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const moisDernier = getMoisKey(moisPrec);
  const dataCe = parMois.find((p) => p.mois === ceMois);
  const dataDernier = parMois.find((p) => p.mois === moisDernier);
  if (!dataCe && !dataDernier) return null;
  const prixCeMois = dataCe?.prixArPerKwh ?? null;
  const prixMoisDernier = dataDernier?.prixArPerKwh ?? null;
  const evolutionPct =
    prixCeMois != null && prixMoisDernier != null && prixMoisDernier > 0
      ? Math.round(((prixCeMois - prixMoisDernier) / prixMoisDernier) * 1000) / 10
      : null;
  return { prixCeMois, prixMoisDernier, evolutionPct };
}

/** Évolution en % du taux journalier sur les 30 derniers jours (début vs fin de période). */
export function getTendanceConsoEvolutionPct30j(releves: Releve[]): number | null {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length < 2) return null;
  const now = Date.now();
  const limit30 = now - 30 * MS_PAR_JOUR;
  const in30 = consos.filter((c) => new Date(c.dateFin).getTime() >= limit30);
  if (in30.length < 2) return null;
  const tauxDebut = in30[0].tauxJournalier;
  const tauxFin = in30[in30.length - 1].tauxJournalier;
  if (tauxDebut <= 0) return null;
  const evolution = ((tauxFin - tauxDebut) / tauxDebut) * 100;
  return Math.round(evolution * 10) / 10;
}

/** Indicateur tendance : baisse | stable | hausse selon évolution % sur 30 j. */
export function getTendanceConsoIndicateur(
  releves: Releve[]
): { indicateur: 'baisse' | 'stable' | 'hausse'; evolutionPct: number | null } {
  const evolutionPct = getTendanceConsoEvolutionPct30j(releves);
  if (evolutionPct === null) return { indicateur: 'stable', evolutionPct: null };
  const seuil = 5;
  if (evolutionPct <= -seuil) return { indicateur: 'baisse', evolutionPct };
  if (evolutionPct >= seuil) return { indicateur: 'hausse', evolutionPct };
  return { indicateur: 'stable', evolutionPct };
}

export interface ResuméPeriode {
  kwh: number;
  coutAr: number;
}

/** Cette semaine (7 derniers jours) et ce mois (mois en cours). */
export function getResumeHebdoEtMensuel(
  releves: Releve[],
  achats: Achat[]
): { semaine: ResuméPeriode; mois: ResuméPeriode } {
  const consos = getConsommationsEntreReleves(releves);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit7 = now.getTime() - 7 * MS_PAR_JOUR;
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let kwhSemaine = 0;
  let kwhMois = 0;
  for (const c of consos) {
    const fin = new Date(c.dateFin).getTime();
    if (fin >= limit7) {
      const debut = new Date(c.dateDebut).getTime();
      const overlapStart = Math.max(debut, limit7);
      const overlapEnd = fin;
      if (overlapEnd > overlapStart) {
        const pct = (overlapEnd - overlapStart) / (fin - debut);
        kwhSemaine += c.kwhConsommes * pct;
      }
    }
    if (fin >= debutMois) {
      const debut = new Date(c.dateDebut).getTime();
      const overlapStart = Math.max(debut, debutMois);
      const overlapEnd = fin;
      if (overlapEnd > overlapStart) {
        const pct = (overlapEnd - overlapStart) / (fin - debut);
        kwhMois += c.kwhConsommes * pct;
      }
    }
  }

  let coutSemaine = 0;
  let coutMois = 0;
  for (const a of achats) {
    const t = new Date(a.date).getTime();
    if (t >= limit7) coutSemaine += a.montantAr;
    if (t >= debutMois) coutMois += a.montantAr;
  }

  return {
    semaine: {
      kwh: Math.round(kwhSemaine * 100) / 100,
      coutAr: Math.round(coutSemaine),
    },
    mois: {
      kwh: Math.round(kwhMois * 100) / 100,
      coutAr: Math.round(coutMois),
    },
  };
}

// ---------- Lot 2 ----------

export interface PrevisionAnnuelle {
  coutAnnuelEstime: number;
  coutMin: number;
  coutMax: number;
}

export function getPrevisionAnnuelle(
  releves: Releve[],
  achats: Achat[]
): PrevisionAnnuelle | null {
  const taux = getTauxJournalierPondere(releves);
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  if (taux == null || taux <= 0 || prixMoyen == null) return null;
  const coutMensuel = getCoutMensuelEstime(taux, prixMoyen);
  const coutAnnuel = Math.round(coutMensuel * 12);
  const consos = getConsommationsEntreReleves(releves);
  let ecartType = 0.15;
  if (consos.length >= 2) {
    const tauxMoy = consos.reduce((s, c) => s + c.tauxJournalier, 0) / consos.length;
    const variance =
      consos.reduce((s, c) => s + (c.tauxJournalier - tauxMoy) ** 2, 0) / consos.length;
    const std = Math.sqrt(variance);
    if (tauxMoy > 0) ecartType = std / tauxMoy;
    ecartType = Math.min(0.4, Math.max(0.08, ecartType));
  }
  const marge = 1 + ecartType;
  const min = Math.round((coutAnnuel / 12) * (1 - ecartType) * 12);
  const max = Math.round((coutAnnuel / 12) * marge * 12);
  return {
    coutAnnuelEstime: coutAnnuel,
    coutMin: min,
    coutMax: max,
  };
}

/** Économie mensuelle si réduction de X % de la conso (défaut 10 %). */
export function getEconomieMensuelleSiReduction(
  releves: Releve[],
  achats: Achat[],
  pctReduction = 10
): number | null {
  const taux = getTauxJournalierPondere(releves);
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  if (taux == null || taux <= 0 || prixMoyen == null) return null;
  const coutActuel = getCoutMensuelEstime(taux, prixMoyen);
  return Math.round(coutActuel * (pctReduction / 100));
}

export interface RechargeTypique {
  intervalleMoyenJours: number;
  prochaineRechargeHabitude: Date | null;
}

export function getRechargeTypique(achats: Achat[]): RechargeTypique | null {
  if (achats.length < 2) return null;
  const tries = [...achats].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const intervals: number[] = [];
  for (let i = 1; i < tries.length; i++) {
    const d1 = new Date(tries[i - 1].date).getTime();
    const d2 = new Date(tries[i].date).getTime();
    intervals.push((d2 - d1) / MS_PAR_JOUR);
  }
  const moyen = intervals.reduce((s, n) => s + n, 0) / intervals.length;
  const dernierAchat = new Date(tries[tries.length - 1].date);
  const prochaine = new Date(dernierAchat);
  prochaine.setDate(prochaine.getDate() + Math.round(moyen));
  return {
    intervalleMoyenJours: Math.round(moyen * 10) / 10,
    prochaineRechargeHabitude: prochaine,
  };
}

// ---------- Lot 3 ----------

export interface AnomalieConso {
  tauxSemaine: number;
  tauxMoyen: number;
  ratio: number;
  isPic: boolean;
}

const SEUIL_RATIO_PIC = 1.5;

export function getAnomalieConsommation(releves: Releve[]): AnomalieConso | null {
  const consos = getConsommationsEntreReleves(releves);
  if (consos.length < 2) return null;
  const now = Date.now();
  const limit7 = now - 7 * MS_PAR_JOUR;
  const limit30 = now - 30 * MS_PAR_JOUR;
  const recent7 = consos.filter((c) => new Date(c.dateFin).getTime() >= limit7);
  const recent30 = consos.filter((c) => new Date(c.dateFin).getTime() >= limit30);
  if (recent7.length === 0 || recent30.length === 0) return null;
  const totalKwh7 = recent7.reduce((s, c) => s + c.kwhConsommes, 0);
  const totalJours7 = recent7.reduce((s, c) => s + c.nbJours, 0);
  const totalKwh30 = recent30.reduce((s, c) => s + c.kwhConsommes, 0);
  const totalJours30 = recent30.reduce((s, c) => s + c.nbJours, 0);
  const tauxSemaine = totalJours7 > 0 ? totalKwh7 / totalJours7 : 0;
  const tauxMoyen = totalJours30 > 0 ? totalKwh30 / totalJours30 : 0;
  if (tauxMoyen <= 0) return null;
  const ratio = tauxSemaine / tauxMoyen;
  return {
    tauxSemaine: Math.round(tauxSemaine * 100) / 100,
    tauxMoyen: Math.round(tauxMoyen * 100) / 100,
    ratio: Math.round(ratio * 100) / 100,
    isPic: ratio >= SEUIL_RATIO_PIC,
  };
}

// ---------- Lot 4 : Saisonnalité ----------

const MOIS_NOMS: Record<number, string> = {
  0: 'janvier', 1: 'février', 2: 'mars', 3: 'avril', 4: 'mai', 5: 'juin',
  6: 'juillet', 7: 'août', 8: 'septembre', 9: 'octobre', 10: 'novembre', 11: 'décembre',
};

export interface Saisonnalite {
  /** Mois (0–11) où la conso est habituellement la plus élevée. */
  moisPlusEleve: number | null;
  message: string | null;
}

/**
 * Avec au moins 12 mois de données, indique si la conso est habituellement plus élevée en un certain mois.
 */
export function getSaisonnalite(
  releves: Releve[],
  _achats: Achat[]
): Saisonnalite | null {
  const parMois = getKwhEtCoutParMois(releves, []);
  const byMonth = new Map<number, number[]>();
  for (const p of parMois) {
    const [, m] = p.mois.split('-').map(Number);
    const monthIndex = m - 1;
    if (!byMonth.has(monthIndex)) byMonth.set(monthIndex, []);
    byMonth.get(monthIndex)!.push(p.kwh);
  }
  const nbMoisAvecDonnees = byMonth.size;
  if (nbMoisAvecDonnees < 12) return null;
  const moyennesParMois: { mois: number; moyenne: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const vals = byMonth.get(i);
    if (vals && vals.length > 0) {
      const moyenne = vals.reduce((s, n) => s + n, 0) / vals.length;
      moyennesParMois.push({ mois: i, moyenne });
    }
  }
  if (moyennesParMois.length < 2) return null;
  const max = moyennesParMois.reduce((best, cur) => (cur.moyenne > best.moyenne ? cur : best), moyennesParMois[0]);
  const nomMois = MOIS_NOMS[max.mois] ?? '';
  return {
    moisPlusEleve: max.mois,
    message: `Consommation habituellement plus élevée en ${nomMois}.`,
  };
}

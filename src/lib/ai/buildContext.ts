import type { Releve } from '../../types';
import {
  getRelevesTries,
  getConsommationsEntreReleves,
  getPrixMoyenArPerKwh,
  getTauxJournalierPondere,
  getCoutMensuelEstime,
} from '../calculs';
import {
  getAnomalieConsommation,
  getComparaisonCeMoisVsDernier,
  getComparaisonPrixMoyenCeMoisVsDernier,
  getResumeHebdoEtMensuel,
  getTendanceConsoIndicateur,
  getPrevisionAnnuelle,
  getSaisonnalite,
} from '../analytics';
import type { PrevisionResult } from '../../context/PrevisionContext';
import type { AppData } from '../../types';
import { loadSettings } from '../storage';

export interface PrevisionAiContext {
  releves: { date: string; creditRestantKwh: number }[];
  consos: { dateFin: string; kwhConsommes: number; nbJours: number; tauxJournalier: number }[];
  creditActuel: number;
  dateDernierReleve: string;
}

export interface FullAiContext {
  prevision: PrevisionAiContext | null;
  creditRestantKwh: number;
  tauxJournalierLocal: number | null;
  joursRestants: number | null;
  prixMoyenArPerKwh: number | null;
  coutMensuelEstimeAr: number | null;
  budgetMensuelAr: number | null;
  objectifKwhMois: number | null;
  noteDuMois: string | null;
  anomalie: {
    isPic: boolean;
    tauxSemaine: number;
    tauxMoyen: number;
    ratio: number;
  } | null;
  comparaisonMois: ReturnType<typeof getComparaisonCeMoisVsDernier>;
  prixComparaison: ReturnType<typeof getComparaisonPrixMoyenCeMoisVsDernier>;
  tendance: ReturnType<typeof getTendanceConsoIndicateur>;
  resume: ReturnType<typeof getResumeHebdoEtMensuel> | null;
  previsionAnnuelle: ReturnType<typeof getPrevisionAnnuelle>;
  saisonnalite: ReturnType<typeof getSaisonnalite>;
}

export function buildPrevisionContext(releves: Releve[]): PrevisionAiContext | null {
  const tries = getRelevesTries(releves);
  if (tries.length === 0) return null;
  const consos = getConsommationsEntreReleves(releves);
  const dernier = tries[tries.length - 1];
  return {
    releves: tries.map((r) => ({ date: r.date, creditRestantKwh: r.creditRestantKwh })),
    consos: consos.map((c) => ({
      dateFin: c.dateFin,
      kwhConsommes: c.kwhConsommes,
      nbJours: c.nbJours,
      tauxJournalier: c.tauxJournalier,
    })),
    creditActuel: dernier.creditRestantKwh,
    dateDernierReleve: dernier.date,
  };
}

export function buildFullAiContext(
  data: AppData,
  prevision: PrevisionResult | null
): FullAiContext {
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
  const dernier = tries[tries.length - 1];
  const tauxLocal = getTauxJournalierPondere(releves);
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const coutMensuel =
    tauxLocal != null && prixMoyen != null ? getCoutMensuelEstime(tauxLocal, prixMoyen) : null;
  const settings = loadSettings();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const anomalie = getAnomalieConsommation(releves);

  return {
    prevision: buildPrevisionContext(releves),
    creditRestantKwh: dernier?.creditRestantKwh ?? 0,
    tauxJournalierLocal: tauxLocal,
    joursRestants: prevision?.joursRestants ?? null,
    prixMoyenArPerKwh: prixMoyen,
    coutMensuelEstimeAr: coutMensuel,
    budgetMensuelAr: settings.budgetMensuelAr ?? null,
    objectifKwhMois: settings.objectifKwhMois ?? null,
    noteDuMois: settings.evenementsParMois?.[currentMonthKey] ?? null,
    anomalie: anomalie
      ? {
          isPic: anomalie.isPic,
          tauxSemaine: anomalie.tauxSemaine,
          tauxMoyen: anomalie.tauxMoyen,
          ratio: anomalie.ratio,
        }
      : null,
    comparaisonMois: getComparaisonCeMoisVsDernier(releves, achats),
    prixComparaison: getComparaisonPrixMoyenCeMoisVsDernier(achats),
    tendance: getTendanceConsoIndicateur(releves),
    resume: releves.length >= 1 ? getResumeHebdoEtMensuel(releves, achats) : null,
    previsionAnnuelle: getPrevisionAnnuelle(releves, achats),
    saisonnalite: getSaisonnalite(releves, achats),
  };
}

/** Hash simple pour éviter des inférences répétées sur le même contexte. */
export function hashAiContext(ctx: FullAiContext): string {
  return JSON.stringify(ctx);
}

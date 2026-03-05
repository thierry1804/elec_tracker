import type { AppData } from '../types';
import type { PrevisionResult } from '../context/PrevisionContext';
import { getComparaisonPrixMoyenCeMoisVsDernier } from './analytics';

/**
 * Retourne un conseil contextuel court selon la situation (ou null).
 */
export function getConseilContextuel(
  data: AppData,
  prevision: PrevisionResult | null
): string | null {
  const { releves } = data;
  const hasReleves = releves.length > 0;
  const joursRestants = prevision?.joursRestants ?? null;
  const now = new Date();
  const isVendredi = now.getDay() === 5;

  if (hasReleves && isVendredi && joursRestants != null && joursRestants > 0 && joursRestants <= 3) {
    return 'Rechargez avant le week-end pour éviter la file.';
  }

  const prixComparaison = getComparaisonPrixMoyenCeMoisVsDernier(data.achats);
  if (prixComparaison?.evolutionPct != null && prixComparaison.evolutionPct > 5) {
    return "Votre prix moyen a augmenté ce mois — comparez les offres.";
  }

  return null;
}

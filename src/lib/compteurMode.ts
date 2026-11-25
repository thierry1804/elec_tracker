import { useSettings } from '../context/SettingsContext';
import type { AppSettings, CompteurMode } from '../types';

export function resolveCompteurMode(settings: AppSettings): CompteurMode {
  if (!settings.compteurActifId) return settings.modePrincipal ?? 'prepaye';
  const actif = settings.compteurs?.find((c) => c.id === settings.compteurActifId);
  return actif?.mode ?? 'prepaye';
}

export function useCompteurMode(): CompteurMode {
  const { settings } = useSettings();
  return resolveCompteurMode(settings);
}

export function labelMode(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'Postpayé' : 'Prépayé';
}

export function labelModeBadge(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'POSTPAYÉ' : 'PRÉPAYÉ';
}

export function labelAchatsNav(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'Factures' : 'Achats';
}

export function labelAchatAction(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'Facture' : 'Achat';
}

export function labelNouvelAchat(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'Nouvelle facture' : 'Nouvel achat';
}

export function labelReleveValeur(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'Index (kWh)' : 'Crédit restant (kWh)';
}

export function labelAchatKwh(mode: CompteurMode): string {
  return mode === 'postpaye' ? 'kWh facturés' : 'Crédit (kWh)';
}

/** Au-delà, le dashboard postpayé signale un relevé trop ancien. */
export const SEUIL_JOURS_RELEVE_POSTPAYE = 35;

export function getJoursDepuisReleve(dateIso: string | undefined): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

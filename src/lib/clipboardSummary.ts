import type { AppData } from '../types';
import { getRelevesTries, getPrixMoyenArPerKwh, getTauxJournalierPondere, getCoutMensuelEstime } from './calculs';
import { loadSettings } from './storage';

/**
 * Génère un résumé texte brut du solde et des stats pour copier-coller rapide.
 */
export function generateTextSummary(data: AppData): string {
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
  const dernier = tries[tries.length - 1];
  const credit = dernier?.creditRestantKwh ?? 0;
  const taux = getTauxJournalierPondere(releves);
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const coutMensuel = taux != null && prixMoyen != null ? getCoutMensuelEstime(taux, prixMoyen) : null;
  const kwhMois = taux != null ? Math.round(taux * 30 * 10) / 10 : null;
  const settings = loadSettings();
  const noteDuMois = (() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return settings.evenementsParMois?.[key];
  })();

  const lines: string[] = [
    `ElecTracker — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
    `Solde : ${credit} kWh`,
    taux != null ? `Conso. moyenne : ${taux.toFixed(2)} kWh/j` : '',
    coutMensuel != null ? `Coût mensuel estimé : ${coutMensuel} Ar` : '',
    kwhMois != null ? `kWh/mois estimé : ${kwhMois}` : '',
    prixMoyen != null ? `Prix moyen : ${prixMoyen.toFixed(2)} Ar/kWh` : '',
    noteDuMois ? `Note : ${noteDuMois}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

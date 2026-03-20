import type { AppData } from '../types';
import { getRelevesTries } from './calculs';
import { getPrixMoyenArPerKwh, getCoutMensuelEstime } from './calculs';
import { getTauxJournalierPondere } from './calculs';
import { loadSettings } from './storage';
import {
  getResumeHebdoEtMensuel,
  getComparaisonCeMoisVsDernier,
  getComparaisonPrixMoyenCeMoisVsDernier,
  getTendanceConsoIndicateur,
  getPrevisionAnnuelle,
  getRechargeTypique,
  getSaisonnalite,
} from './analytics';

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAr(ar: number): string {
  return Math.round(ar).toLocaleString('fr-FR') + ' Ar';
}

/**
 * Génère un rapport HTML de synthèse (solde, dernier relevé, dernier achat, conso moyenne, coût mensuel, objectif) + insights + tableaux.
 */
export function generateReportHtml(data: AppData): string {
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const taux = getTauxJournalierPondere(releves);
  const coutMensuel =
    taux != null && prixMoyen != null ? getCoutMensuelEstime(taux, prixMoyen) : null;
  const settings = loadSettings();
  const kwhMoisEstime = taux != null ? Math.round(taux * 30 * 10) / 10 : null;

  const rowsReleves = tries
    .slice(-50)
    .reverse()
    .map(
      (r) =>
        `<tr><td>${formatDate(r.date)}</td><td>${r.creditRestantKwh}</td></tr>`
    )
    .join('');
  const rowsAchats = [...achats]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)
    .map(
      (a) =>
        `<tr><td>${formatDate(a.date)}</td><td>${a.montantAr}</td><td>${a.creditKwh}</td><td>${a.prixUnitaireArPerKwh.toFixed(2)}</td></tr>`
    )
    .join('');

  const objectifLine =
    settings.budgetMensuelAr != null || settings.objectifKwhMois != null
      ? `<p><strong>Objectif :</strong> ${settings.budgetMensuelAr != null ? `Budget ${settings.budgetMensuelAr} Ar/mois` : ''} ${settings.budgetMensuelAr != null && settings.objectifKwhMois != null ? ' · ' : ''} ${settings.objectifKwhMois != null ? `Consommation ${settings.objectifKwhMois} kWh/mois` : ''}</p>`
      : '';

  // Note du mois
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const noteDuMois = settings.evenementsParMois?.[currentMonthKey];
  const noteHtml = noteDuMois
    ? `<p><strong>Note du mois :</strong> ${escapeHtml(noteDuMois)}</p>`
    : '';

  // Insights
  const insightsLines: string[] = [];
  const hasData = releves.length >= 2 || achats.length >= 1;

  if (hasData) {
    const resume = getResumeHebdoEtMensuel(releves, achats);
    insightsLines.push(
      `<li>7 derniers jours : ${resume.semaine.kwh} kWh consommés, recharges ${formatAr(resume.semaine.coutAr)}</li>`
    );
    insightsLines.push(
      `<li>Mois en cours : ${resume.mois.kwh} kWh consommés, recharges ${formatAr(resume.mois.coutAr)}</li>`
    );

    const comparaison = getComparaisonCeMoisVsDernier(releves, achats);
    if (comparaison) {
      const evKwh = comparaison.evolutionKwhPct != null ? ` (${comparaison.evolutionKwhPct > 0 ? '+' : ''}${comparaison.evolutionKwhPct} %)` : '';
      const evCout = comparaison.evolutionCoutPct != null ? ` (${comparaison.evolutionCoutPct > 0 ? '+' : ''}${comparaison.evolutionCoutPct} %)` : '';
      insightsLines.push(
        `<li>Ce mois vs précédent : ${comparaison.kwhCeMois} vs ${comparaison.kwhMoisDernier} kWh${evKwh}, coût ${formatAr(comparaison.coutCeMois)} vs ${formatAr(comparaison.coutMoisDernier)}${evCout}</li>`
      );
    }

    const prixComp = getComparaisonPrixMoyenCeMoisVsDernier(achats);
    if (prixComp && (prixComp.prixCeMois != null || prixComp.prixMoisDernier != null)) {
      const ce = prixComp.prixCeMois != null ? `${prixComp.prixCeMois.toFixed(2)} Ar/kWh` : '—';
      const prec = prixComp.prixMoisDernier != null ? `${prixComp.prixMoisDernier.toFixed(2)} Ar/kWh` : '—';
      insightsLines.push(`<li>Prix moyen : ce mois ${ce}, précédent ${prec}</li>`);
    }

    const tendance = getTendanceConsoIndicateur(releves);
    if (tendance.evolutionPct != null) {
      const labels = { baisse: 'en baisse', stable: 'stable', hausse: 'en hausse' };
      insightsLines.push(
        `<li>Tendance 30 j : consommation ${labels[tendance.indicateur]} (${tendance.evolutionPct > 0 ? '+' : ''}${tendance.evolutionPct} %)</li>`
      );
    }

    const prevision = getPrevisionAnnuelle(releves, achats);
    if (prevision) {
      insightsLines.push(
        `<li>Projection annuelle : ${formatAr(prevision.coutAnnuelEstime)} (fourchette ${formatAr(prevision.coutMin)} – ${formatAr(prevision.coutMax)})</li>`
      );
    }

    const recharge = getRechargeTypique(achats);
    if (recharge) {
      let line = `Fréquence recharge : ~${recharge.intervalleMoyenJours} jours`;
      if (recharge.prochaineRechargeHabitude) {
        line += `, prochaine suggérée le ${recharge.prochaineRechargeHabitude.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      }
      insightsLines.push(`<li>${line}</li>`);
    }

    const saison = getSaisonnalite(releves, achats);
    if (saison?.message) {
      insightsLines.push(`<li>${escapeHtml(saison.message)}</li>`);
    }
  }

  const insightsSection = insightsLines.length > 0
    ? `<h2>Insights</h2><ul>${insightsLines.join('')}</ul>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Rapport ElecTracker — ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #333; }
    h1 { font-size: 1.25rem; }
    h2 { font-size: 1rem; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; }
    th { background: #f5f5f5; }
    p { margin: 0.4rem 0; }
    ul { margin: 0.5rem 0; padding-left: 1.5rem; }
    li { margin: 0.3rem 0; }
  </style>
</head>
<body>
  <h1>Rapport ElecTracker — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</h1>
  <h2>Synthèse</h2>
  <p><strong>Solde actuel :</strong> ${creditRestant} kWh</p>
  <p><strong>Dernier relevé :</strong> ${dernierReleve ? formatDate(dernierReleve.date) : '—'}</p>
  <p><strong>Dernier achat :</strong> ${achats.length > 0 ? formatDate([...achats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date) : '—'}</p>
  <p><strong>Consommation moyenne (taux journalier) :</strong> ${taux != null ? taux.toFixed(2) + ' kWh/j' : '—'}</p>
  <p><strong>Coût mensuel estimé :</strong> ${coutMensuel != null ? coutMensuel + ' Ar' : '—'}</p>
  <p><strong>kWh/mois estimé :</strong> ${kwhMoisEstime != null ? kwhMoisEstime + ' kWh' : '—'}</p>
  ${objectifLine}
  ${noteHtml}
  ${insightsSection}
  <h2>Derniers relevés</h2>
  <table><thead><tr><th>Date</th><th>Crédit restant (kWh)</th></tr></thead><tbody>${rowsReleves || '<tr><td colspan="2">Aucun relevé</td></tr>'}</tbody></table>
  <h2>Derniers achats</h2>
  <table><thead><tr><th>Date</th><th>Montant (Ar)</th><th>Crédit (kWh)</th><th>Prix unitaire (Ar/kWh)</th></tr></thead><tbody>${rowsAchats || '<tr><td colspan="4">Aucun achat</td></tr>'}</tbody></table>
</body>
</html>`;
}

export function downloadReportHtml(data: AppData): void {
  const html = generateReportHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `electracker-rapport-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

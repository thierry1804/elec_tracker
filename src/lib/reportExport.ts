import type { AppData } from '../types';
import { getRelevesTries } from './calculs';
import { getPrixMoyenArPerKwh, getCoutMensuelEstime } from './calculs';
import { getTauxJournalierPondere } from './calculs';
import { loadSettings } from './storage';

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Génère un rapport HTML de synthèse (solde, dernier relevé, dernier achat, conso moyenne, coût mensuel, objectif) + tableaux.
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

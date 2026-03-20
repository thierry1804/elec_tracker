import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppData } from '../types';
import { getRelevesTries, getPrixMoyenArPerKwh, getTauxJournalierPondere, getCoutMensuelEstime } from './calculs';
import { loadSettings } from './storage';

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function downloadReportPdf(data: AppData): void {
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
  const dernier = tries[tries.length - 1];
  const credit = dernier?.creditRestantKwh ?? 0;
  const taux = getTauxJournalierPondere(releves);
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const coutMensuel = taux != null && prixMoyen != null ? getCoutMensuelEstime(taux, prixMoyen) : null;
  const kwhMois = taux != null ? Math.round(taux * 30 * 10) / 10 : null;
  const settings = loadSettings();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Titre
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Rapport ElecTracker - ${new Date().toLocaleDateString('fr-FR')}`,
    14,
    20
  );

  // Synthèse
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Synthese', 14, 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = [
    `Solde actuel : ${credit} kWh`,
    `Dernier releve : ${dernier ? formatDate(dernier.date) : '-'}`,
    `Consommation moyenne : ${taux != null ? taux.toFixed(2) + ' kWh/j' : '-'}`,
    `Cout mensuel estime : ${coutMensuel != null ? coutMensuel + ' Ar' : '-'}`,
    `kWh/mois estime : ${kwhMois != null ? kwhMois + ' kWh' : '-'}`,
    `Prix moyen : ${prixMoyen != null ? prixMoyen.toFixed(2) + ' Ar/kWh' : '-'}`,
  ];

  if (settings.budgetMensuelAr != null) {
    summaryLines.push(`Objectif budget : ${settings.budgetMensuelAr} Ar/mois`);
  }
  if (settings.objectifKwhMois != null) {
    summaryLines.push(`Objectif conso : ${settings.objectifKwhMois} kWh/mois`);
  }

  // Note du mois
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const note = settings.evenementsParMois?.[monthKey];
  if (note) {
    summaryLines.push(`Note du mois : ${note}`);
  }

  let y = 38;
  for (const line of summaryLines) {
    doc.text(line, 14, y);
    y += 5.5;
  }

  // Tableau des relevés
  y += 4;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Derniers releves', 14, y);
  y += 2;

  const releveRows = tries
    .slice(-30)
    .reverse()
    .map((r) => [formatDate(r.date), String(r.creditRestantKwh)]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Credit restant (kWh)']],
    body: releveRows.length > 0 ? releveRows : [['Aucun releve', '']],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [88, 166, 255] },
    margin: { left: 14, right: 14 },
  });

  // Tableau des achats
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 10;
  const achatStartY = finalY + 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Derniers achats', 14, achatStartY);

  const achatRows = [...achats]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .map((a) => [
      formatDate(a.date),
      String(a.montantAr),
      String(a.creditKwh),
      a.prixUnitaireArPerKwh.toFixed(2),
    ]);

  autoTable(doc, {
    startY: achatStartY + 2,
    head: [['Date', 'Montant (Ar)', 'Credit (kWh)', 'Prix (Ar/kWh)']],
    body: achatRows.length > 0 ? achatRows : [['Aucun achat', '', '', '']],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [210, 153, 34] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`electracker-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
}

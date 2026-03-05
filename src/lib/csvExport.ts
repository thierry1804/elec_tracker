import type { Achat, Releve } from '../types';
import { getRelevesTries, getConsommationsEntreReleves } from './calculs';

const CSV_SEP = ';';
const UTF8_BOM = '\uFEFF';

function formatDateFr(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateHeureFr(d: string): string {
  const date = new Date(d);
  const hasTime = d.length > 10 && d.includes('T');
  return hasTime
    ? date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : formatDateFr(d);
}

function formatDuree(nbJours: number): string {
  if (nbJours < 1) return `${(nbJours * 24).toFixed(1).replace('.', ',')} h`;
  return Number.isInteger(nbJours)
    ? `${nbJours} j`
    : `${nbJours.toFixed(1).replace('.', ',')} j`;
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRelevesCSV(releves: Releve[]): void {
  const tries = getRelevesTries(releves);
  const consos = getConsommationsEntreReleves(releves);

  const headers = [
    'Date et heure',
    'Crédit restant (kWh)',
    'Consommation calculée (kWh)',
    'Durée',
  ];
  const rows: string[][] = [headers];

  for (let i = 0; i < tries.length; i++) {
    const releve = tries[i];
    const conso = i > 0 ? consos[i - 1] : null;
    rows.push([
      formatDateHeureFr(releve.date),
      String(releve.creditRestantKwh),
      conso != null ? conso.kwhConsommes.toFixed(2) : '—',
      conso != null ? formatDuree(conso.nbJours) : '—',
    ]);
  }

  const csv = rows.map((row) => row.join(CSV_SEP)).join('\n');
  const filename = `electracker-releves-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
}

export function exportAchatsCSV(achats: Achat[]): void {
  const headers = ['Date', 'Montant (Ar)', 'Crédit (kWh)', 'Prix unitaire (Ar/kWh)'];
  const sorted = [...achats].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const rows: string[][] = [headers];

  for (const a of sorted) {
    rows.push([
      formatDateFr(a.date),
      String(a.montantAr),
      String(a.creditKwh),
      Math.round(a.prixUnitaireArPerKwh).toString(),
    ]);
  }

  const csv = rows.map((row) => row.join(CSV_SEP)).join('\n');
  const filename = `electracker-achats-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);
}

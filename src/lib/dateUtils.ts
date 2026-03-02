/**
 * Convertit une date ISO (YYYY-MM-DD) en format français jj/mm/aaaa
 */
export function toFrenchDate(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Convertit une chaîne jj/mm/aaaa (ou j/m/aaaa) en date ISO YYYY-MM-DD
 */
export function fromFrenchDate(s: string): string {
  const trimmed = s.trim().replace(/\s/g, '');
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

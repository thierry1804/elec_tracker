import { describe, it, expect } from 'vitest';
import { formatDuree, formatMontant, formatNombre, formatNombreSouple } from '../format';

describe('formatMontant', () => {
  it('formats in Ar by default', () => {
    expect(formatMontant(15000)).toMatch(/15.*000.*Ar/);
  });

  it('formats in kAr', () => {
    const result = formatMontant(15000, { uniteAffichage: 'kar', arrondiMontant: 'entier' });
    expect(result).toContain('kAr');
    expect(result).toContain('15');
  });

  it('formats with decimals', () => {
    const result = formatMontant(15500.75, { arrondiMontant: 'decimales' });
    expect(result).toContain('Ar');
  });

  it('formats zero', () => {
    expect(formatMontant(0)).toMatch(/0.*Ar/);
  });
});

describe('formatNombre', () => {
  it('utilise la virgule décimale et des décimales fixes', () => {
    expect(formatNombre(17.6, 1)).toBe('17,6');
    expect(formatNombre(2.7, 2)).toBe('2,70');
    expect(formatNombre(2.47)).toBe('2,47');
    expect(formatNombre(9, 1)).toBe('9,0');
  });

  it('ne produit jamais de point décimal', () => {
    for (const v of [0, 0.5, 2.47, 17.6, 380.95238, -1.5]) {
      expect(formatNombre(v, 2)).not.toContain('.');
    }
  });

  it('sépare les milliers sans point ni virgule', () => {
    expect(formatNombre(1234.5, 1).replace(/\s/g, ' ')).toBe('1 234,5');
  });

  it('garde le signe négatif', () => {
    expect(formatNombre(-2.5, 1)).toMatch(/^[-−]2,5$/);
  });
});

describe('formatNombreSouple', () => {
  it('retire les zéros inutiles', () => {
    expect(formatNombreSouple(9)).toBe('9');
    expect(formatNombreSouple(17.6)).toBe('17,6');
    expect(formatNombreSouple(14.9)).toBe('14,9');
  });

  it('plafonne les décimales', () => {
    expect(formatNombreSouple(380.95238095, 2)).toBe('380,95');
  });
});

describe('formatDuree', () => {
  it('affiche des heures sous un jour', () => {
    expect(formatDuree(23.4 / 24)).toBe('23,4 h');
  });

  it('affiche des jours à partir d’un jour', () => {
    expect(formatDuree(1.4)).toBe('1,4 j');
    expect(formatDuree(3)).toBe('3 j');
  });
});

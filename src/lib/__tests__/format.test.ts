import { describe, it, expect } from 'vitest';
import { formatMontant } from '../format';

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

import { describe, it, expect } from 'vitest';
import {
  getKwhEtCoutParMois,
  getRechargeTypique,
  getAnomalieConsommation,
} from '../analytics';
import type { Releve, Achat } from '../../types';

const releves: Releve[] = [
  { id: 'r1', date: '2025-01-01T12:00:00.000Z', creditRestantKwh: 100 },
  { id: 'r2', date: '2025-01-15T12:00:00.000Z', creditRestantKwh: 70 },
  { id: 'r3', date: '2025-02-01T12:00:00.000Z', creditRestantKwh: 40 },
  { id: 'r4', date: '2025-02-15T12:00:00.000Z', creditRestantKwh: 20 },
];

const achats: Achat[] = [
  { id: 'a1', date: '2025-01-10T12:00:00.000Z', montantAr: 10000, creditKwh: 50, prixUnitaireArPerKwh: 200 },
  { id: 'a2', date: '2025-02-05T12:00:00.000Z', montantAr: 12000, creditKwh: 48, prixUnitaireArPerKwh: 250 },
];

describe('getKwhEtCoutParMois', () => {
  it('returns data per month', () => {
    const result = getKwhEtCoutParMois(releves, achats);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty('mois');
    expect(result[0]).toHaveProperty('kwh');
    expect(result[0]).toHaveProperty('coutAr');
  });

  it('returns empty for empty input', () => {
    expect(getKwhEtCoutParMois([], [])).toEqual([]);
  });
});

describe('getRechargeTypique', () => {
  it('computes average interval', () => {
    const result = getRechargeTypique(achats);
    expect(result).not.toBeNull();
    expect(result!.intervalleMoyenJours).toBeGreaterThan(0);
    expect(result!.prochaineRechargeHabitude).toBeInstanceOf(Date);
  });

  it('returns null for less than 2 achats', () => {
    expect(getRechargeTypique([achats[0]])).toBeNull();
    expect(getRechargeTypique([])).toBeNull();
  });
});

describe('getAnomalieConsommation', () => {
  it('returns null for too few releves', () => {
    expect(getAnomalieConsommation([])).toBeNull();
    expect(getAnomalieConsommation([releves[0]])).toBeNull();
  });
});

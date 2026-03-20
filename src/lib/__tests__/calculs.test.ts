import { describe, it, expect } from 'vitest';
import {
  getRelevesTries,
  getConsommationsEntreReleves,
  getPrixMoyenArPerKwh,
  getCoutMensuelEstime,
  isAlerteCreditFaible,
  getJoursRestants,
  getDonneesGraphiqueConso,
} from '../calculs';
import type { Releve, Achat } from '../../types';

const releves: Releve[] = [
  { id: 'r1', date: '2025-01-10T12:00:00.000Z', creditRestantKwh: 50 },
  { id: 'r2', date: '2025-01-15T12:00:00.000Z', creditRestantKwh: 40 },
  { id: 'r3', date: '2025-01-20T12:00:00.000Z', creditRestantKwh: 30 },
];

const achats: Achat[] = [
  { id: 'a1', date: '2025-01-05T12:00:00.000Z', montantAr: 10000, creditKwh: 50, prixUnitaireArPerKwh: 200 },
  { id: 'a2', date: '2025-01-18T12:00:00.000Z', montantAr: 15000, creditKwh: 60, prixUnitaireArPerKwh: 250 },
];

describe('getRelevesTries', () => {
  it('sorts releves by date', () => {
    const shuffled = [releves[2], releves[0], releves[1]];
    const sorted = getRelevesTries(shuffled);
    expect(sorted[0].id).toBe('r1');
    expect(sorted[1].id).toBe('r2');
    expect(sorted[2].id).toBe('r3');
  });

  it('returns empty for empty input', () => {
    expect(getRelevesTries([])).toEqual([]);
  });
});

describe('getConsommationsEntreReleves', () => {
  it('computes consumption between readings', () => {
    const consos = getConsommationsEntreReleves(releves);
    expect(consos).toHaveLength(2);
    expect(consos[0].kwhConsommes).toBe(10);
    expect(consos[1].kwhConsommes).toBe(10);
    expect(consos[0].nbJours).toBeCloseTo(5, 0);
  });

  it('returns empty for single releve', () => {
    expect(getConsommationsEntreReleves([releves[0]])).toEqual([]);
  });
});

describe('getPrixMoyenArPerKwh', () => {
  it('computes average unit price', () => {
    const avg = getPrixMoyenArPerKwh(achats);
    expect(avg).toBe(225); // (200 + 250) / 2
  });

  it('returns null for empty', () => {
    expect(getPrixMoyenArPerKwh([])).toBeNull();
  });
});

describe('getCoutMensuelEstime', () => {
  it('computes monthly cost estimate', () => {
    const cost = getCoutMensuelEstime(2, 200); // 2 kWh/j * 30 * 200
    expect(cost).toBe(12000);
  });
});

describe('isAlerteCreditFaible', () => {
  it('returns true when credit below threshold', () => {
    expect(isAlerteCreditFaible(15, 10)).toBe(true);
  });

  it('returns true when days below threshold', () => {
    expect(isAlerteCreditFaible(50, 5)).toBe(true);
  });

  it('returns false when both above thresholds', () => {
    expect(isAlerteCreditFaible(50, 30)).toBe(false);
  });
});

describe('getJoursRestants', () => {
  it('returns 0 for past date', () => {
    const past = new Date('2020-01-01');
    expect(getJoursRestants(past)).toBe(0);
  });

  it('returns null for null date', () => {
    expect(getJoursRestants(null)).toBeNull();
  });
});

describe('getDonneesGraphiqueConso', () => {
  it('groups consumption by day', () => {
    const data = getDonneesGraphiqueConso(releves);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('conso');
    expect(data[0]).toHaveProperty('label');
  });

  it('returns empty for single releve', () => {
    expect(getDonneesGraphiqueConso([releves[0]])).toEqual([]);
  });
});

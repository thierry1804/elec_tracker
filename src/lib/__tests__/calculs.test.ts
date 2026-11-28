import { describe, it, expect } from 'vitest';
import {
  getRelevesTries,
  getConsommationsEntreReleves,
  getPrixMoyenArPerKwh,
  getTauxJournalierPondere,
  getCoutMensuelEstime,
  isAlerteCreditFaible,
  getJoursRestants,
  getDonneesGraphiqueConso,
  isTypeCompteurSuspect,
  getProjectionIndexFinDeMois,
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

  it('postpayé : index actuel moins index précédent', () => {
    const index: Releve[] = [
      { id: 'i1', date: '2025-02-01T12:00:00.000Z', creditRestantKwh: 1000 },
      { id: 'i2', date: '2025-02-11T12:00:00.000Z', creditRestantKwh: 1012 },
    ];
    const consos = getConsommationsEntreReleves(index, 'postpaye');
    expect(consos).toHaveLength(1);
    expect(consos[0].kwhConsommes).toBe(12);
  });

  it('postpayé : index qui baisse est exclu du taux', () => {
    const index: Releve[] = [
      { id: 'i1', date: '2025-02-01T12:00:00.000Z', creditRestantKwh: 1000 },
      { id: 'i2', date: '2025-02-11T12:00:00.000Z', creditRestantKwh: 990 },
    ];
    const consos = getConsommationsEntreReleves(index, 'postpaye');
    expect(consos[0].kwhConsommes).toBe(-10);
    expect(getTauxJournalierPondere(index, 'postpaye')).toBeNull();
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

describe('isTypeCompteurSuspect', () => {
  const releve = (id: string, jour: number, credit: number) => ({
    id,
    date: `2026-11-${String(jour).padStart(2, '0')}T12:00:00.000Z`,
    creditRestantKwh: credit,
  });
  const montants = [releve('a', 22, 0), releve('b', 23, 3), releve('c', 25, 9), releve('d', 26, 11.2)];
  const descendants = [releve('a', 22, 20), releve('b', 23, 17), releve('c', 25, 11)];

  it('signale un compteur prépayé dont les relevés montent sans achat', () => {
    expect(isTypeCompteurSuspect(montants, 'prepaye', 0)).toBe(true);
  });

  it('ne signale rien si des achats expliquent la hausse', () => {
    expect(isTypeCompteurSuspect(montants, 'prepaye', 2)).toBe(false);
  });

  it('ne signale rien pour un prépayé dont le crédit baisse', () => {
    expect(isTypeCompteurSuspect(descendants, 'prepaye', 0)).toBe(false);
  });

  it('signale un compteur postpayé dont l’index baisse à chaque relevé', () => {
    expect(isTypeCompteurSuspect(descendants, 'postpaye', 0)).toBe(true);
    expect(isTypeCompteurSuspect(montants, 'postpaye', 0)).toBe(false);
  });

  it('exige au moins deux intervalles pour conclure', () => {
    expect(isTypeCompteurSuspect(montants.slice(0, 2), 'prepaye', 0)).toBe(false);
    expect(isTypeCompteurSuspect([], 'postpaye', 0)).toBe(false);
  });
});

describe('getProjectionIndexFinDeMois', () => {
  // Index postpayé : 10 kWh le 10 nov. à midi, 16 kWh le 13 nov. (2 kWh/j).
  const releve = (id: string, jour: number, index: number) => ({
    id,
    date: new Date(2026, 10, jour, 12, 0, 0).toISOString(),
    creditRestantKwh: index,
  });
  const releves = [releve('a', 10, 10), releve('b', 13, 16)];
  const now = new Date(2026, 10, 14, 9, 0, 0);

  it('projette l’index jour par jour jusqu’au dernier jour du mois', () => {
    const p = getProjectionIndexFinDeMois(releves, 2, now)!;
    expect(p.points[0].date).toBe('2026-11-14');
    expect(p.points[0].solde).toBeCloseTo(18, 5);
    expect(p.points[p.points.length - 1].date).toBe('2026-11-30');
    expect(p.points).toHaveLength(17);
    expect(p.indexFinMois).toBeCloseTo(16 + 2 * 17, 5);
  });

  it('encadre la projection par une fourchette', () => {
    const p = getProjectionIndexFinDeMois(releves, 2, now)!;
    for (const pt of p.points) {
      expect(pt.soldeMin).toBeLessThanOrEqual(pt.solde);
      expect(pt.soldeMax).toBeGreaterThanOrEqual(pt.solde);
    }
  });

  it('interpole l’index du 1er du mois entre les relevés qui l’encadrent', () => {
    const octobre = { id: 'o', date: new Date(2026, 9, 28, 12).toISOString(), creditRestantKwh: 100 };
    const novembre = { id: 'n', date: new Date(2026, 10, 3, 12).toISOString(), creditRestantKwh: 112 };
    const p = getProjectionIndexFinDeMois([octobre, novembre], 2, new Date(2026, 10, 4, 9))!;
    expect(p.depuisPremierReleve).toBe(false);
    // 12 kWh en 6 j ; du 28/10 midi au 1er/11 minuit : 3,5 j, soit un index de 107 au 1er.
    expect(p.consoMois).toBeCloseTo(p.indexFinMois - 107, 5);
  });

  it('compte depuis le premier relevé du mois quand aucun relevé ne précède le 1er', () => {
    const p = getProjectionIndexFinDeMois(releves, 2, now)!;
    expect(p.depuisPremierReleve).toBe(true);
    expect(p.consoMois).toBeCloseTo(p.indexFinMois - 10, 5);
  });

  it('ne projette rien sans rythme, sans relevé, ou si le dernier relevé est le dernier jour du mois', () => {
    expect(getProjectionIndexFinDeMois(releves, 0, now)).toBeNull();
    expect(getProjectionIndexFinDeMois([], 2, now)).toBeNull();
    const fin = [releve('a', 29, 10), releve('b', 30, 12)];
    expect(getProjectionIndexFinDeMois(fin, 2, new Date(2026, 10, 30, 20))).toBeNull();
  });

  it('ne projette pas à partir d’un relevé vieux de plus d’un mois', () => {
    expect(getProjectionIndexFinDeMois(releves, 2, new Date(2026, 11, 20))).toBeNull();
  });
});

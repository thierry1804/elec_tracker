import { describe, it, expect } from 'vitest';
import { rankCandidates, readIndexFromWords, wordsToCandidates, type OcrWord } from '../readIndex';

const word = (text: string, x0: number, confidence = 90, y0 = 10, h = 40): OcrWord => ({
  text,
  confidence,
  bbox: { x0, y0, x1: x0 + text.length * 25, y1: y0 + h },
});

describe('wordsToCandidates', () => {
  it('extrait les nombres assez longs pour être un index', () => {
    const c = wordsToCandidates([word('00176', 0), word('7', 400), word('50', 500), word('kWh', 600)]);
    expect(c.map((x) => x.raw)).toContain('00176');
    expect(c.map((x) => x.raw)).not.toContain('50');
    expect(c.find((x) => x.raw === '00176')?.value).toBe(176);
  });

  it('lit la virgule et le point comme séparateur décimal', () => {
    const c = wordsToCandidates([word('17,6', 0), word('02345.7', 300)]);
    expect(c.find((x) => x.raw === '17,6')?.value).toBeCloseTo(17.6);
    expect(c.find((x) => x.raw === '02345.7')?.value).toBeCloseTo(2345.7);
  });

  it('colle un chiffre isolé voisin comme décimale (case des dixièmes)', () => {
    const c = wordsToCandidates([word('00176', 0), word('4', 140)]);
    expect(c.some((x) => x.raw === '00176.4' && Math.abs(x.value - 176.4) < 1e-9)).toBe(true);
  });

  it('ne colle pas un chiffre situé sur une autre ligne ou trop loin', () => {
    const loin = wordsToCandidates([word('00176', 0), word('4', 900)]);
    expect(loin.some((x) => x.raw.includes('.'))).toBe(false);
    const autreLigne = wordsToCandidates([word('00176', 0), word('4', 140, 90, 300)]);
    expect(autreLigne.some((x) => x.raw.includes('.'))).toBe(false);
  });

  it('ignore les nombres de plus de 9 chiffres (numéro de série)', () => {
    expect(wordsToCandidates([word('1234567890123', 0)])).toEqual([]);
  });
});

describe('rankCandidates', () => {
  const cand = (raw: string, value: number, confidence = 90) => ({ raw, value, confidence });

  it('sans index précédent, se fie à la confiance', () => {
    const r = rankCandidates([cand('00176', 176, 60), cand('02345', 2345, 95)], null);
    expect(r[0].value).toBe(2345);
  });

  it('écarte une lecture inférieure à l’index précédent', () => {
    const r = rankCandidates([cand('01234', 1234, 95), cand('01310', 1310, 80)], 1300);
    expect(r[0].value).toBe(1310);
  });

  it('préfère la lecture la plus proche au-dessus de l’index précédent', () => {
    const r = rankCandidates([cand('01500', 1500, 90), cand('01312', 1312, 85)], 1300);
    expect(r[0].value).toBe(1312);
  });

  it('propose la lecture « dernier chiffre = décimale » et la choisit si elle colle à l’historique', () => {
    const r = rankCandidates([cand('00176', 176, 90)], 14.9);
    expect(r.map((x) => x.value)).toEqual(expect.arrayContaining([176, 17.6]));
    expect(r[0].value).toBeCloseTo(17.6);
    expect(r[0].deduced).toBe(true);
  });

  it('garde l’entier quand il colle à l’historique entier', () => {
    const r = rankCandidates([cand('00176', 176, 90)], 170);
    expect(r[0].value).toBe(176);
    expect(r[0].deduced).toBeUndefined();
  });

  it('ne garde qu’une entrée par valeur et au plus cinq lectures', () => {
    const r = rankCandidates(
      [cand('00176', 176, 90), cand('00176', 176, 50), cand('1111', 1111), cand('2222', 2222), cand('3333', 3333), cand('4444', 4444), cand('5555', 5555)],
      null,
    );
    expect(r.filter((x) => x.value === 176 && !x.deduced)).toHaveLength(1);
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it('renvoie une liste vide sans lecture', () => {
    expect(rankCandidates([], 100)).toEqual([]);
    expect(readIndexFromWords([], 100)).toEqual([]);
  });
});

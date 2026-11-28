export interface OcrWord {
  text: string;
  /** Confiance de Tesseract, 0 à 100. */
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface IndexCandidate {
  value: number;
  /** Texte tel que lu sur la photo. */
  raw: string;
  confidence: number;
  /** Score de classement : confiance + vraisemblance par rapport à l'index précédent. */
  score: number;
  /** Lecture déduite (le dernier chiffre pris pour la décimale) et non vue telle quelle. */
  deduced?: boolean;
}

const TOKEN = /\d+(?:[.,]\d+)?/g;
const MAX_DIGITS = 9;
const MAX_CANDIDATES = 5;

const countDigits = (s: string): number => s.replace(/\D/g, '').length;
const hasSeparator = (s: string): boolean => /[.,]/.test(s);

/** Un nombre assez long pour être un index (évite les « 1 », « 50 » parasites d'un autocollant, d'un logo…). */
function plausibleToken(raw: string): boolean {
  const d = countDigits(raw);
  return d <= MAX_DIGITS && (d >= 3 || (hasSeparator(raw) && d >= 2));
}

type RawCandidate = Omit<IndexCandidate, 'score'>;

/**
 * Nombres lisibles dans les mots reconnus. Un chiffre isolé collé à un nombre entier sur la même ligne
 * (case décimale d'un compteur à rouleaux) est lu comme sa décimale : « 00176 » puis « 4 » donne 176,4.
 */
export function wordsToCandidates(words: OcrWord[]): RawCandidate[] {
  const out: RawCandidate[] = [];

  for (const w of words) {
    for (const token of w.text.match(TOKEN) ?? []) {
      if (!plausibleToken(token)) continue;
      out.push({ value: parseFloat(token.replace(',', '.')), raw: token, confidence: w.confidence });
    }
  }

  const sorted = [...words].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  for (const a of sorted) {
    if (!/^\d{3,}$/.test(a.text.trim())) continue;
    const ha = a.bbox.y1 - a.bbox.y0;
    for (const b of sorted) {
      if (b === a || !/^\d$/.test(b.text.trim())) continue;
      const hb = b.bbox.y1 - b.bbox.y0;
      const h = Math.max(ha, hb, 1);
      const memeLigne = Math.abs((a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2) < 0.6 * h;
      const gap = b.bbox.x0 - a.bbox.x1;
      if (memeLigne && gap >= -0.2 * h && gap < 1.5 * h) {
        const raw = `${a.text.trim()}.${b.text.trim()}`;
        if (countDigits(raw) <= MAX_DIGITS) {
          out.push({ value: parseFloat(raw), raw, confidence: Math.min(a.confidence, b.confidence) });
        }
      }
    }
  }
  return out;
}

/**
 * Classe les lectures. Sans index précédent, on se fie à la confiance. Avec un index précédent (compteur
 * postpayé), un index ne baisse jamais et progresse peu entre deux relevés : on favorise la lecture la plus
 * proche au-dessus, et on propose aussi la lecture « dernier chiffre = décimale » quand la photo n'en montre pas.
 */
export function rankCandidates(raw: RawCandidate[], previousIndex: number | null): IndexCandidate[] {
  const pool: RawCandidate[] = [...raw];
  for (const c of raw) {
    if (!hasSeparator(c.raw) && countDigits(c.raw) >= 4) {
      pool.push({ value: c.value / 10, raw: c.raw, confidence: c.confidence, deduced: true });
    }
  }

  const scored = pool.map((c) => {
    let score = c.confidence / 100;
    const d = countDigits(c.raw);
    if (d >= 4 && d <= 7) score += 0.1;
    if (c.deduced) score -= 0.05;
    if (previousIndex != null) {
      const delta = c.value - previousIndex;
      if (delta < -0.05) score -= 0.6;
      else if (delta <= 500) score += 0.5 * (1 - delta / 500);
      else if (delta > 1000) score -= 0.3;
    }
    return { ...c, score };
  });

  // Une seule entrée par valeur : la mieux classée.
  const best = new Map<number, IndexCandidate>();
  for (const c of scored) {
    const key = Math.round(c.value * 1000);
    const prev = best.get(key);
    if (!prev || c.score > prev.score) best.set(key, c);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);
}

export function readIndexFromWords(words: OcrWord[], previousIndex: number | null): IndexCandidate[] {
  return rankCandidates(wordsToCandidates(words), previousIndex);
}

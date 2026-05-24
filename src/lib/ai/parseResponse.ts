/** Extrait un objet JSON d'une réponse texte (éventuellement dans un bloc markdown). */
function extractJsonObject(text: string, keyHint: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(new RegExp(`\\{[\\s\\S]*"${keyHint}"[\\s\\S]*\\}`));
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Extrait tauxJournalier d'une réponse IA (texte ou JSON). */
export function parsePrevisionResponse(text: string): number | null {
  const obj = extractJsonObject(text, 'tauxJournalier');
  if (obj) {
    const t = obj.tauxJournalier;
    if (typeof t === 'number' && t > 0 && t < 1000) return t;
    return null;
  }
  const trimmed = text.trim();
  const numMatch = trimmed.match(/\d+[.,]?\d*/);
  if (numMatch) {
    const n = parseFloat(numMatch[0].replace(',', '.'));
    if (n > 0 && n < 1000) return n;
  }
  return null;
}

export interface InterpretationResult {
  interpretation: string;
  recommandations: string[];
}

export function parseInterpretationResponse(text: string): InterpretationResult | null {
  const obj = extractJsonObject(text, 'interpretation');
  if (!obj || typeof obj.interpretation !== 'string') return null;
  const interpretation = obj.interpretation.trim();
  if (!interpretation) return null;
  const rawRecs = obj.recommandations;
  const recommandations = Array.isArray(rawRecs)
    ? rawRecs.filter((r): r is string => typeof r === 'string' && r.trim().length > 0).map((r) => r.trim())
    : [];
  return { interpretation, recommandations };
}

export interface ReportSynthesisResult {
  synthese: string;
  pointsClefs: string[];
}

export function parseReportResponse(text: string): ReportSynthesisResult | null {
  const obj = extractJsonObject(text, 'synthese');
  if (!obj || typeof obj.synthese !== 'string') return null;
  const synthese = obj.synthese.trim();
  if (!synthese) return null;
  const rawPoints = obj.pointsClefs;
  const pointsClefs = Array.isArray(rawPoints)
    ? rawPoints.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map((p) => p.trim())
    : [];
  return { synthese, pointsClefs };
}

import type { Releve } from '../types';
import type { AiSettings } from '../types';
import { getRelevesTries, getConsommationsEntreReleves } from './calculs';

/** Contexte envoyé à l’IA pour la prévision. */
export interface PrevisionContext {
  releves: { date: string; creditRestantKwh: number }[];
  consos: { dateFin: string; kwhConsommes: number; nbJours: number; tauxJournalier: number }[];
  creditActuel: number;
  dateDernierReleve: string;
}

function buildContext(releves: Releve[]): PrevisionContext | null {
  const tries = getRelevesTries(releves);
  if (tries.length === 0) return null;
  const consos = getConsommationsEntreReleves(releves);
  const dernier = tries[tries.length - 1];
  return {
    releves: tries.map((r) => ({ date: r.date, creditRestantKwh: r.creditRestantKwh })),
    consos: consos.map((c) => ({
      dateFin: c.dateFin,
      kwhConsommes: c.kwhConsommes,
      nbJours: c.nbJours,
      tauxJournalier: c.tauxJournalier,
    })),
    creditActuel: dernier.creditRestantKwh,
    dateDernierReleve: dernier.date,
  };
}

function buildPrompt(ctx: PrevisionContext): string {
  const system = `Tu es un assistant qui aide à prévoir la consommation électrique journalière (kWh/jour) pour un compteur prépayé.
À partir de l'historique des relevés et des consommations entre relevés, estime le taux de consommation journalier (kWh par jour) à utiliser pour la prévision.
Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ou après, avec exactement cette forme :
{"tauxJournalier": <nombre décimal>}
Le taux doit être en kWh/jour, positif et réaliste (souvent entre 0.5 et 20).`;

  const user = `Historique des relevés (date, solde en kWh) :
${ctx.releves.map((r) => `- ${r.date}: ${r.creditRestantKwh} kWh`).join('\n')}

Consommations entre relevés (date fin, kWh consommés, nb jours, taux kWh/jour) :
${ctx.consos.map((c) => `- ${c.dateFin}: ${c.kwhConsommes.toFixed(2)} kWh en ${c.nbJours.toFixed(2)} j (≈ ${c.tauxJournalier.toFixed(2)} kWh/j)`).join('\n')}

Solde actuel : ${ctx.creditActuel} kWh (relevé du ${ctx.dateDernierReleve}).
Donne l'estimation du taux journalier (tauxJournalier) à utiliser pour prévoir la date d'épuisement.`;

  return JSON.stringify({ system, user });
}

/** Extrait tauxJournalier d’une réponse IA (texte ou JSON). */
export function parsePrevisionResponse(text: string): number | null {
  const trimmed = text.trim();
  // Essayer d’extraire un objet JSON (éventuellement dans un bloc markdown)
  const jsonMatch = trimmed.match(/\{[\s\S]*"tauxJournalier"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]) as { tauxJournalier?: number };
      const t = obj.tauxJournalier;
      if (typeof t === 'number' && t > 0 && t < 1000) return t;
    } catch {
      // ignore
    }
  }
  // Fallback: un nombre décimal seul
  const numMatch = trimmed.match(/\d+[.,]?\d*/);
  if (numMatch) {
    const n = parseFloat(numMatch[0].replace(',', '.'));
    if (n > 0 && n < 1000) return n;
  }
  return null;
}

/** Appelle l’API OpenAI-compatible et retourne le taux journalier estimé ou null. */
export async function fetchPrevisionTaux(
  settings: AiSettings,
  releves: Releve[],
  signal?: AbortSignal
): Promise<number | null> {
  const ctx = buildContext(releves);
  if (!ctx) return null;

  const { system, user } = JSON.parse(buildPrompt(ctx)) as { system: string; user: string };
  const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const url = `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    signal,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 150,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn('[ElecTracker AI] API error:', res.status, errText);
    return null;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  return parsePrevisionResponse(content);
}

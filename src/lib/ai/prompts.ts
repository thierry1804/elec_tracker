import type { FullAiContext, PrevisionAiContext } from './buildContext';

export type AiTask = 'prevision' | 'interpretation' | 'report';

export interface AiPromptMessages {
  system: string;
  user: string;
}

const SYSTEM_BASE = `Tu es un assistant pour ElecTracker, une app de suivi d'électricité prépayée à Madagascar.
Réponds en français, ton direct et sobre, sans jargon.
Réponds UNIQUEMENT par un objet JSON valide, sans texte avant ou après.`;

function formatPrevisionUser(ctx: PrevisionAiContext): string {
  return `Historique des relevés (date, solde en kWh) :
${ctx.releves.map((r) => `- ${r.date}: ${r.creditRestantKwh} kWh`).join('\n')}

Consommations entre relevés (date fin, kWh consommés, nb jours, taux kWh/jour) :
${ctx.consos.map((c) => `- ${c.dateFin}: ${c.kwhConsommes.toFixed(2)} kWh en ${c.nbJours.toFixed(2)} j (≈ ${c.tauxJournalier.toFixed(2)} kWh/j)`).join('\n')}

Solde actuel : ${ctx.creditActuel} kWh (relevé du ${ctx.dateDernierReleve}).
Estime le taux journalier (kWh/jour) pour prévoir la date d'épuisement.`;
}

function formatFullContext(ctx: FullAiContext): string {
  const lines: string[] = [
    `Solde : ${ctx.creditRestantKwh} kWh`,
    ctx.tauxJournalierLocal != null ? `Conso. moyenne locale : ${ctx.tauxJournalierLocal.toFixed(2)} kWh/j` : '',
    ctx.joursRestants != null ? `Jours restants estimés : ${ctx.joursRestants}` : '',
    ctx.prixMoyenArPerKwh != null ? `Prix moyen : ${ctx.prixMoyenArPerKwh.toFixed(2)} Ar/kWh` : '',
    ctx.coutMensuelEstimeAr != null ? `Coût mensuel estimé : ${ctx.coutMensuelEstimeAr} Ar` : '',
    ctx.budgetMensuelAr != null ? `Budget mensuel : ${ctx.budgetMensuelAr} Ar` : '',
    ctx.objectifKwhMois != null ? `Objectif conso. : ${ctx.objectifKwhMois} kWh/mois` : '',
    ctx.noteDuMois ? `Note du mois : ${ctx.noteDuMois}` : '',
  ].filter(Boolean);

  if (ctx.anomalie?.isPic) {
    lines.push(
      `Pic de conso. : ${ctx.anomalie.tauxSemaine} kWh/j cette semaine vs ${ctx.anomalie.tauxMoyen} kWh/j en moyenne (ratio ${ctx.anomalie.ratio})`
    );
  }
  if (ctx.comparaisonMois) {
    lines.push(
      `Ce mois vs précédent : ${ctx.comparaisonMois.kwhCeMois} vs ${ctx.comparaisonMois.kwhMoisDernier} kWh`
    );
  }
  if (ctx.tendance.evolutionPct != null) {
    lines.push(`Tendance 30 j : ${ctx.tendance.indicateur} (${ctx.tendance.evolutionPct} %)`);
  }
  if (ctx.prixComparaison?.evolutionPct != null) {
    lines.push(`Évolution prix moyen : ${ctx.prixComparaison.evolutionPct} %`);
  }
  if (ctx.resume) {
    lines.push(
      `7 j : ${ctx.resume.semaine.kwh} kWh, ${ctx.resume.semaine.coutAr} Ar · Mois : ${ctx.resume.mois.kwh} kWh, ${ctx.resume.mois.coutAr} Ar`
    );
  }
  if (ctx.previsionAnnuelle) {
    lines.push(`Projection annuelle : ${ctx.previsionAnnuelle.coutAnnuelEstime} Ar`);
  }
  if (ctx.saisonnalite?.message) {
    lines.push(`Saisonnalité : ${ctx.saisonnalite.message}`);
  }

  return lines.join('\n');
}

export function buildPrompt(task: AiTask, ctx: FullAiContext): AiPromptMessages | null {
  if (task === 'prevision') {
    if (!ctx.prevision) return null;
    return {
      system: `${SYSTEM_BASE}
Estime le taux de consommation journalier (kWh/jour) pour un compteur prépayé.
Forme exacte : {"tauxJournalier": <nombre décimal>}
Le taux doit être positif et réaliste (souvent entre 0.5 et 20).`,
      user: formatPrevisionUser(ctx.prevision),
    };
  }

  if (task === 'interpretation') {
    return {
      system: `${SYSTEM_BASE}
Interprète la situation et propose des recommandations concises et actionnables.
Forme exacte : {"interpretation": "<1-2 phrases>", "recommandations": ["<conseil 1>", "<conseil 2>"]}
Maximum 3 recommandations, phrases courtes.`,
      user: `Situation actuelle :\n${formatFullContext(ctx)}\n\nExplique la situation et recommande des actions.`,
    };
  }

  return {
    system: `${SYSTEM_BASE}
Rédige une synthèse pour un rapport mensuel d'électricité prépayée.
Forme exacte : {"synthese": "<2-4 phrases>", "pointsClefs": ["<point 1>", "<point 2>", "<point 3>"]}
Maximum 5 points clés.`,
    user: `Données du rapport :\n${formatFullContext(ctx)}\n\nRédige la synthèse.`,
  };
}

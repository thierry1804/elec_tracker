import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../prompts';
import type { FullAiContext } from '../buildContext';

const baseContext: FullAiContext = {
  prevision: {
    releves: [{ date: '2026-05-01', creditRestantKwh: 50 }],
    consos: [],
    creditActuel: 50,
    dateDernierReleve: '2026-05-01',
  },
  creditRestantKwh: 50,
  tauxJournalierLocal: 2,
  joursRestants: 10,
  prixMoyenArPerKwh: 1500,
  coutMensuelEstimeAr: 90000,
  budgetMensuelAr: 80000,
  objectifKwhMois: null,
  noteDuMois: 'Climatisation',
  anomalie: null,
  comparaisonMois: null,
  prixComparaison: null,
  tendance: { indicateur: 'stable', evolutionPct: null },
  resume: null,
  previsionAnnuelle: null,
  saisonnalite: null,
};

describe('buildPrompt', () => {
  it('génère un prompt prévision avec tauxJournalier', () => {
    const prompt = buildPrompt('prevision', baseContext);
    expect(prompt?.system).toContain('tauxJournalier');
    expect(prompt?.user).toContain('50 kWh');
  });

  it('génère un prompt interprétation', () => {
    const prompt = buildPrompt('interpretation', baseContext);
    expect(prompt?.system).toContain('recommandations');
    expect(prompt?.user).toContain('Climatisation');
  });

  it('génère un prompt rapport', () => {
    const prompt = buildPrompt('report', baseContext);
    expect(prompt?.system).toContain('synthese');
  });
});

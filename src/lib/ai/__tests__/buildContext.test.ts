import { describe, it, expect } from 'vitest';
import { buildFullAiContext, buildPrevisionContext } from '../buildContext';
import type { AppData } from '../../../types';

const sampleData: AppData = {
  releves: [
    { id: '1', date: '2026-05-01T08:00:00.000Z', creditRestantKwh: 100 },
    { id: '2', date: '2026-05-10T08:00:00.000Z', creditRestantKwh: 80 },
    { id: '3', date: '2026-05-20T08:00:00.000Z', creditRestantKwh: 55 },
  ],
  achats: [
    {
      id: 'a1',
      date: '2026-05-05T10:00:00.000Z',
      montantAr: 50000,
      creditKwh: 30,
      prixUnitaireArPerKwh: 1666.67,
    },
  ],
};

describe('buildPrevisionContext', () => {
  it('retourne null sans relevé', () => {
    expect(buildPrevisionContext([])).toBeNull();
  });

  it('inclut le solde actuel', () => {
    const ctx = buildPrevisionContext(sampleData.releves);
    expect(ctx?.creditActuel).toBe(55);
    expect(ctx?.releves).toHaveLength(3);
    expect(ctx?.consos.length).toBeGreaterThan(0);
  });
});

describe('buildFullAiContext', () => {
  it('agrège les faits principaux', () => {
    const ctx = buildFullAiContext(sampleData, null);
    expect(ctx.creditRestantKwh).toBe(55);
    expect(ctx.prevision).not.toBeNull();
    expect(ctx.tauxJournalierLocal).not.toBeNull();
  });
});

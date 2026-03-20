import { describe, it, expect } from 'vitest';
import { validateAppData } from '../validation';

describe('validateAppData', () => {
  it('validates correct data', () => {
    const result = validateAppData({
      releves: [{ id: 'r1', date: '2025-01-01T12:00:00.000Z', creditRestantKwh: 50 }],
      achats: [{ id: 'a1', date: '2025-01-01T12:00:00.000Z', montantAr: 10000, creditKwh: 50, prixUnitaireArPerKwh: 200 }],
    });
    expect(result.valid).toBe(true);
    expect(result.sanitized.releves).toHaveLength(1);
    expect(result.sanitized.achats).toHaveLength(1);
  });

  it('rejects non-object', () => {
    const result = validateAppData(null);
    expect(result.valid).toBe(false);
  });

  it('filters invalid releves', () => {
    const result = validateAppData({
      releves: [
        { id: 'r1', date: '2025-01-01T12:00:00.000Z', creditRestantKwh: 50 },
        { id: '', date: 'bad', creditRestantKwh: -1 }, // invalid
        'not an object', // invalid
      ],
      achats: [],
    });
    expect(result.sanitized.releves).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('deduplicates by ID', () => {
    const result = validateAppData({
      releves: [
        { id: 'r1', date: '2025-01-01T12:00:00.000Z', creditRestantKwh: 50 },
        { id: 'r1', date: '2025-01-02T12:00:00.000Z', creditRestantKwh: 40 },
      ],
      achats: [],
    });
    expect(result.sanitized.releves).toHaveLength(1);
  });

  it('recalculates missing prixUnitaire', () => {
    const result = validateAppData({
      releves: [],
      achats: [{ id: 'a1', date: '2025-01-01T12:00:00.000Z', montantAr: 10000, creditKwh: 50 }],
    });
    expect(result.sanitized.achats[0].prixUnitaireArPerKwh).toBe(200);
  });
});

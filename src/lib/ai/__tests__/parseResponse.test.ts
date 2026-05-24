import { describe, it, expect } from 'vitest';
import {
  parsePrevisionResponse,
  parseInterpretationResponse,
  parseReportResponse,
} from '../parseResponse';

describe('parsePrevisionResponse', () => {
  it('parse JSON valide', () => {
    expect(parsePrevisionResponse('{"tauxJournalier": 3.42}')).toBe(3.42);
  });

  it('parse JSON dans bloc markdown', () => {
    expect(parsePrevisionResponse('```json\n{"tauxJournalier": 2.5}\n```')).toBe(2.5);
  });

  it('parse nombre seul en fallback', () => {
    expect(parsePrevisionResponse('4,2')).toBe(4.2);
  });

  it('retourne null si invalide', () => {
    expect(parsePrevisionResponse('pas un nombre')).toBeNull();
    expect(parsePrevisionResponse('{"tauxJournalier": -1}')).toBeNull();
  });
});

describe('parseInterpretationResponse', () => {
  it('parse interprétation avec recommandations', () => {
    const result = parseInterpretationResponse(
      '{"interpretation": "Conso en hausse.", "recommandations": ["Rechargez", "Vérifiez le frigo"]}'
    );
    expect(result).toEqual({
      interpretation: 'Conso en hausse.',
      recommandations: ['Rechargez', 'Vérifiez le frigo'],
    });
  });

  it('retourne null sans interpretation', () => {
    expect(parseInterpretationResponse('{"recommandations": []}')).toBeNull();
  });
});

describe('parseReportResponse', () => {
  it('parse synthèse rapport', () => {
    const result = parseReportResponse(
      '{"synthese": "Mois stable.", "pointsClefs": ["Solde OK", "Budget respecté"]}'
    );
    expect(result).toEqual({
      synthese: 'Mois stable.',
      pointsClefs: ['Solde OK', 'Budget respecté'],
    });
  });
});

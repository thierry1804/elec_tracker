import { describe, it, expect } from 'vitest';
import { resolveCompteurMode } from '../compteurMode';
import type { AppSettings } from '../../types';

describe('resolveCompteurMode', () => {
  it('retourne prepaye si le mode est absent', () => {
    expect(resolveCompteurMode({})).toBe('prepaye');
  });

  it('lit le mode explicite du compteur principal', () => {
    const settings: AppSettings = { modePrincipal: 'postpaye' };
    expect(resolveCompteurMode(settings)).toBe('postpaye');
  });

  it('lit le mode du compteur nommé actif', () => {
    const settings: AppSettings = {
      compteurActifId: 'b',
      modePrincipal: 'prepaye',
      compteurs: [
        { id: 'a', nom: 'Maison', mode: 'prepaye' },
        { id: 'b', nom: 'Bureau', mode: 'postpaye' },
      ],
    };
    expect(resolveCompteurMode(settings)).toBe('postpaye');
  });

  it('retombe sur prepaye si le compteur actif est introuvable', () => {
    const settings: AppSettings = { compteurActifId: 'manquant', compteurs: [] };
    expect(resolveCompteurMode(settings)).toBe('prepaye');
  });
});

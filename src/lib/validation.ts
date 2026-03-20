import type { AppData, Achat, Releve } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: AppData;
}

function isValidIsoDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function validateReleve(r: unknown, index: number): { releve: Releve | null; error?: string } {
  if (!r || typeof r !== 'object') return { releve: null, error: `Relevé #${index}: objet invalide` };
  const obj = r as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id) return { releve: null, error: `Relevé #${index}: id manquant` };
  if (!isValidIsoDate(obj.date)) return { releve: null, error: `Relevé #${index}: date invalide` };
  if (typeof obj.creditRestantKwh !== 'number' || !Number.isFinite(obj.creditRestantKwh))
    return { releve: null, error: `Relevé #${index}: creditRestantKwh invalide` };

  return {
    releve: {
      id: obj.id,
      date: obj.date as string,
      creditRestantKwh: obj.creditRestantKwh,
      ...(typeof obj.fromAchat === 'boolean' ? { fromAchat: obj.fromAchat } : {}),
    },
  };
}

function validateAchat(a: unknown, index: number): { achat: Achat | null; error?: string } {
  if (!a || typeof a !== 'object') return { achat: null, error: `Achat #${index}: objet invalide` };
  const obj = a as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id) return { achat: null, error: `Achat #${index}: id manquant` };
  if (!isValidIsoDate(obj.date)) return { achat: null, error: `Achat #${index}: date invalide` };
  if (typeof obj.montantAr !== 'number' || !Number.isFinite(obj.montantAr) || obj.montantAr <= 0)
    return { achat: null, error: `Achat #${index}: montantAr invalide` };
  if (typeof obj.creditKwh !== 'number' || !Number.isFinite(obj.creditKwh) || obj.creditKwh <= 0)
    return { achat: null, error: `Achat #${index}: creditKwh invalide` };

  const prixUnitaire = typeof obj.prixUnitaireArPerKwh === 'number' && Number.isFinite(obj.prixUnitaireArPerKwh)
    ? obj.prixUnitaireArPerKwh
    : obj.montantAr as number / (obj.creditKwh as number);

  return {
    achat: {
      id: obj.id,
      date: obj.date as string,
      montantAr: obj.montantAr as number,
      creditKwh: obj.creditKwh as number,
      prixUnitaireArPerKwh: prixUnitaire,
    },
  };
}

/**
 * Valide et assainit un objet AppData (typiquement issu d'un import JSON).
 * Retourne les entrées valides + la liste des erreurs détectées.
 */
export function validateAppData(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const releves: Releve[] = [];
  const achats: Achat[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Les données ne sont pas un objet valide.'], sanitized: { achats: [], releves: [] } };
  }

  const data = raw as Record<string, unknown>;

  if (Array.isArray(data.releves)) {
    for (let i = 0; i < data.releves.length; i++) {
      const { releve, error } = validateReleve(data.releves[i], i);
      if (releve) releves.push(releve);
      if (error) errors.push(error);
    }
  } else if (data.releves !== undefined) {
    errors.push('Le champ "releves" doit être un tableau.');
  }

  if (Array.isArray(data.achats)) {
    for (let i = 0; i < data.achats.length; i++) {
      const { achat, error } = validateAchat(data.achats[i], i);
      if (achat) achats.push(achat);
      if (error) errors.push(error);
    }
  } else if (data.achats !== undefined) {
    errors.push('Le champ "achats" doit être un tableau.');
  }

  // Déduplications par ID
  const seenReleveIds = new Set<string>();
  const uniqueReleves = releves.filter((r) => {
    if (seenReleveIds.has(r.id)) {
      errors.push(`Relevé dupliqué ignoré: ${r.id}`);
      return false;
    }
    seenReleveIds.add(r.id);
    return true;
  });

  const seenAchatIds = new Set<string>();
  const uniqueAchats = achats.filter((a) => {
    if (seenAchatIds.has(a.id)) {
      errors.push(`Achat dupliqué ignoré: ${a.id}`);
      return false;
    }
    seenAchatIds.add(a.id);
    return true;
  });

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { releves: uniqueReleves, achats: uniqueAchats },
  };
}

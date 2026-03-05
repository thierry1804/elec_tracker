export interface Achat {
  id: string;
  date: string; // ISO
  montantAr: number;
  creditKwh: number;
  prixUnitaireArPerKwh: number;
}

export interface Releve {
  id: string;
  date: string; // ISO
  creditRestantKwh: number;
}

export interface AppData {
  achats: Achat[];
  releves: Releve[];
}

export type TabId = 'dashboard' | 'historique' | 'achats';

/** Paramètres pour l’IA de prévision (clé API, modèle, etc.). */
export interface AiSettings {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** Objectif / budget mensuel (optionnel). */
export interface AppSettings {
  budgetMensuelAr?: number;
  objectifKwhMois?: number;
  /** Unité d'affichage des montants. */
  uniteAffichage?: 'ar' | 'kar';
  /** Arrondi des montants. */
  arrondiMontant?: 'entier' | 'decimales';
  /** Période par défaut des graphiques (jours ou tout). */
  periodeGraphiques?: '7' | '30' | '90' | 'tout';
}

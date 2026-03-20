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
  /** Relevé créé automatiquement avec un achat (solde théorique). L’affichage du solde utilise le dernier relevé manuel. */
  fromAchat?: boolean;
}

export interface AppData {
  achats: Achat[];
  releves: Releve[];
}

export type TabId = 'dashboard' | 'historique' | 'achats';

export interface Compteur {
  id: string;
  nom: string;
}


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
  /** Notes persistantes par mois (clé au format YYYY-MM). */
  evenementsParMois?: Record<string, string>;
  /** Liste des compteurs (multi-logement). */
  compteurs?: Compteur[];
  /** ID du compteur actuellement sélectionné. */
  compteurActifId?: string;
}

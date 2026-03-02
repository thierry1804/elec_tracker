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

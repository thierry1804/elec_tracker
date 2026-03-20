import { useState, useEffect, useCallback } from 'react';
import type { AppData, Achat, Releve } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';

function dateStrToLocalEndOfDayMs(date: string): number {
  // Si `date` inclut une heure (ISO), on prend directement le timestamp.
  if (date.includes('T')) return new Date(date).getTime();
  // Sinon, on interprète `YYYY-MM-DD` comme une date locale à midi.
  const [y, m, d] = date.split('-').map((v) => Number(v));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  return dt.getTime();
}

function dateStrToIso(date: string): string {
  // Si c'est déjà une ISO avec heure, on normalise juste.
  if (date.includes('T')) return new Date(date).toISOString();
  return new Date(dateStrToLocalEndOfDayMs(date)).toISOString();
}

function debutJourLocalMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function finJourLocalMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Solde après achat = dernier relevé **avant** l’instant d’achat + crédit acheté.
 * Si l’achat est enregistré tôt le jour (ex. minuit / date seule) alors qu’un relevé existe
 * plus tard ce jour-là, sans ça on prenait le relevé de la veille comme base (ex. 12,9 + 52 au lieu de 8,83 + 52).
 */
function ajusterInstantAchatApresRelevesMemeJour(achatMs: number, releves: Releve[]): number {
  const lo = debutJourLocalMs(achatMs);
  const hi = finJourLocalMs(achatMs);
  let maxReleve = 0;
  let has = false;
  for (const r of releves) {
    const t = dateStrToLocalEndOfDayMs(r.date);
    if (t >= lo && t <= hi) {
      has = true;
      maxReleve = Math.max(maxReleve, t);
    }
  }
  if (!has) return achatMs;
  return Math.max(achatMs, maxReleve + 1);
}

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addReleve = useCallback((date: string, creditRestantKwh: number) => {
    const releve: Releve = {
      id: generateId(),
      date,
      creditRestantKwh,
    };
    setData((prev) => ({
      ...prev,
      releves: [...prev.releves, releve],
    }));
  }, []);

  const addAchat = useCallback((date: string, montantAr: number, creditKwh: number) => {
    const prixUnitaireArPerKwh = creditKwh > 0 ? montantAr / creditKwh : 0;
    const achat: Achat = {
      id: generateId(),
      // On mettra une date ISO cohérente (fin de journée locale) plus bas.
      date,
      montantAr,
      creditKwh,
      prixUnitaireArPerKwh,
    };
    setData((prev) => {
      const relevesTries = [...prev.releves].sort(
        (a, b) => dateStrToLocalEndOfDayMs(a.date) - dateStrToLocalEndOfDayMs(b.date)
      );

      let achatTime = dateStrToLocalEndOfDayMs(date);
      achatTime = ajusterInstantAchatApresRelevesMemeJour(achatTime, relevesTries);

      const dernierAvantAchat = relevesTries
        .filter((r) => dateStrToLocalEndOfDayMs(r.date) <= achatTime)
        .pop();
      const creditAuMomentDeAchat = dernierAvantAchat?.creditRestantKwh ?? 0;
      const nouveauCreditRestant = creditAuMomentDeAchat + creditKwh;

      // Relevé synthétique : immédiatement après le dernier relevé utilisé comme base (= dernier solde + kWh achetés).
      const baseTimeMs = dernierAvantAchat ? dateStrToLocalEndOfDayMs(dernierAvantAchat.date) : achatTime;
      const dateReleveAchatMs = baseTimeMs + 1; // +1ms garantit "après" le relevé précédent
      const dateIsoCohérente = new Date(dateReleveAchatMs).toISOString();

      const releveAchat: Releve = {
        id: generateId(),
        date: dateIsoCohérente,
        creditRestantKwh: nouveauCreditRestant,
        fromAchat: true,
      };
      return {
        ...prev,
        achats: [
          ...prev.achats,
          {
            ...achat,
            date: dateIsoCohérente,
          },
        ],
        releves: [...prev.releves, releveAchat],
      };
    });
  }, []);

  const updateReleve = useCallback(
    (id: string, patch: { date?: string; creditRestantKwh?: number }) => {
      setData((prev) => ({
        ...prev,
        releves: prev.releves.map((r) =>
          r.id === id
            ? {
                ...r,
                ...(patch.date != null && { date: patch.date }),
                ...(patch.creditRestantKwh != null && {
                  creditRestantKwh: patch.creditRestantKwh,
                }),
              }
            : r
        ),
      }));
    },
    []
  );

  const updateAchat = useCallback(
    (id: string, patch: { date?: string; montantAr?: number; creditKwh?: number }) => {
      setData((prev) => ({
        ...prev,
        achats: prev.achats.map((a) => {
          if (a.id !== id) return a;
          const date = dateStrToIso(patch.date ?? a.date);
          const montantAr = patch.montantAr ?? a.montantAr;
          const creditKwh = patch.creditKwh ?? a.creditKwh;
          const prixUnitaireArPerKwh =
            creditKwh > 0 ? montantAr / creditKwh : a.prixUnitaireArPerKwh;
          return {
            ...a,
            date,
            montantAr,
            creditKwh,
            prixUnitaireArPerKwh,
          };
        }),
      }));
    },
    []
  );

  const deleteReleve = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      releves: prev.releves.filter((r) => r.id !== id),
    }));
  }, []);

  const deleteAchat = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      achats: prev.achats.filter((a) => a.id !== id),
    }));
  }, []);

  const replaceData = useCallback((newData: AppData) => {
    setData(newData);
  }, []);

  const mergeAndSetData = useCallback((imported: AppData) => {
    setData((prev) => {
      const existingIdsReleves = new Set(prev.releves.map((r) => r.id));
      const existingIdsAchats = new Set(prev.achats.map((a) => a.id));
      const releves = [
        ...prev.releves,
        ...imported.releves.filter((r) => !existingIdsReleves.has(r.id)),
      ].sort((a, b) => dateStrToLocalEndOfDayMs(a.date) - dateStrToLocalEndOfDayMs(b.date));
      const achats = [
        ...prev.achats,
        ...imported.achats.filter((a) => !existingIdsAchats.has(a.id)),
      ].sort((a, b) => dateStrToLocalEndOfDayMs(a.date) - dateStrToLocalEndOfDayMs(b.date));
      return { releves, achats };
    });
  }, []);

  return {
    data,
    addReleve,
    addAchat,
    updateReleve,
    updateAchat,
    deleteReleve,
    deleteAchat,
    replaceData,
    mergeAndSetData,
  };
}

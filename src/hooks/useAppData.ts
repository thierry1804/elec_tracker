import { useState, useEffect, useCallback } from 'react';
import type { AppData, Achat, Releve } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';

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
      date,
      montantAr,
      creditKwh,
      prixUnitaireArPerKwh,
    };
    setData((prev) => {
      const relevesTries = [...prev.releves].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const achatTime = new Date(date).getTime();
      const dernierAvantAchat = relevesTries
        .filter((r) => new Date(r.date).getTime() <= achatTime)
        .pop();
      const creditAuMomentDeAchat = dernierAvantAchat?.creditRestantKwh ?? 0;
      const nouveauCreditRestant = creditAuMomentDeAchat + creditKwh;
      const releveAchat: Releve = {
        id: generateId(),
        date,
        creditRestantKwh: nouveauCreditRestant,
      };
      return {
        ...prev,
        achats: [...prev.achats, achat],
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
          const date = patch.date ?? a.date;
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
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const achats = [
        ...prev.achats,
        ...imported.achats.filter((a) => !existingIdsAchats.has(a.id)),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

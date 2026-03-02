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

  return { data, addReleve, addAchat, deleteReleve, deleteAchat };
}

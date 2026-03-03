import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import type { Releve } from '../types';
import {
  getRelevesTries,
  getTauxJournalierPrediction,
  getDateEpuisementEstimee,
  getJoursRestants,
  getProchainAchatSuggere,
  getKwhAchatSuggere,
  getDonneesPrevisionAvecIntervalleFromTaux,
} from '../lib/calculs';
import { loadAiSettings } from '../lib/aiSettings';
import { fetchPrevisionTaux } from '../lib/aiPrevision';

export interface PrevisionResult {
  tauxJournalier: number | null;
  dateEpuisement: Date | null;
  joursRestants: number | null;
  prochainAchatDate: Date | null;
  kwhAchatSuggere: number | null;
  donneesPrevision: { date: string; solde: number; soldeMin: number; soldeMax: number }[];
  source: 'ai' | 'fallback';
  loading: boolean;
  error: string | null;
}

function computeFallback(releves: Releve[]): PrevisionResult {
  const tries = getRelevesTries(releves);
  const dernier = tries[tries.length - 1];
  const creditRestant = dernier?.creditRestantKwh ?? 0;
  const dateDernierReleve = dernier?.date;

  const tauxJournalier = getTauxJournalierPrediction(releves);
  const dateEpuisement =
    tauxJournalier != null &&
    tauxJournalier > 0 &&
    dateDernierReleve
      ? getDateEpuisementEstimee(creditRestant, tauxJournalier, dateDernierReleve)
      : null;
  const joursRestants = getJoursRestants(dateEpuisement);
  const prochainAchatDate = getProchainAchatSuggere(dateEpuisement);
  const kwhAchatSuggere = getKwhAchatSuggere(tauxJournalier);
  const donneesPrevision =
    tauxJournalier != null && tauxJournalier > 0
      ? getDonneesPrevisionAvecIntervalleFromTaux(releves, tauxJournalier)
      : [];

  return {
    tauxJournalier: tauxJournalier ?? null,
    dateEpuisement,
    joursRestants,
    prochainAchatDate,
    kwhAchatSuggere,
    donneesPrevision,
    source: 'fallback',
    loading: false,
    error: null,
  };
}

function buildFromTaux(
  releves: Releve[],
  tauxJournalier: number,
  source: 'ai' | 'fallback'
): PrevisionResult {
  const tries = getRelevesTries(releves);
  const dernier = tries[tries.length - 1];
  if (!dernier) return computeFallback(releves);

  const dateEpuisement = getDateEpuisementEstimee(
    dernier.creditRestantKwh,
    tauxJournalier,
    dernier.date
  );
  const joursRestants = getJoursRestants(dateEpuisement);
  const prochainAchatDate = getProchainAchatSuggere(dateEpuisement);
  const kwhAchatSuggere = getKwhAchatSuggere(tauxJournalier);
  const donneesPrevision = getDonneesPrevisionAvecIntervalleFromTaux(
    releves,
    tauxJournalier
  );

  return {
    tauxJournalier,
    dateEpuisement,
    joursRestants,
    prochainAchatDate,
    kwhAchatSuggere,
    donneesPrevision,
    source,
    loading: false,
    error: null,
  };
}

const PrevisionContext = createContext<PrevisionResult | null>(null);

export function PrevisionProvider({
  releves,
  children,
}: {
  releves: Releve[];
  children: React.ReactNode;
}) {
  const fallback = useMemo(() => computeFallback(releves), [releves]);
  const [result, setResult] = useState<PrevisionResult>(fallback);
  const abortRef = useRef<AbortController | null>(null);
  const prevRelevesRef = useRef<string>('');

  useEffect(() => {
    const relevesKey = JSON.stringify(releves.map((r) => r.date + r.creditRestantKwh));
    const fallbackResult = computeFallback(releves);

    const settings = loadAiSettings();
    if (!settings?.apiKey || releves.length < 2) {
      setResult({ ...fallbackResult, loading: false });
      return;
    }

    setResult({ ...fallbackResult, loading: true, error: null });

    if (relevesKey === prevRelevesRef.current) return;
    prevRelevesRef.current = relevesKey;

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    fetchPrevisionTaux(settings, releves, signal)
      .then((taux) => {
        if (signal.aborted) return;
        if (taux != null && taux > 0) {
          setResult(buildFromTaux(releves, taux, 'ai'));
        } else {
          setResult({ ...fallbackResult, loading: false });
        }
      })
      .catch(() => {
        if (signal.aborted) return;
        setResult({
          ...fallbackResult,
          loading: false,
          error: 'IA indisponible',
        });
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [releves]);

  const value = useMemo(() => result, [result]);

  return (
    <PrevisionContext.Provider value={value}>
      {children}
    </PrevisionContext.Provider>
  );
}

export function usePrevision(): PrevisionResult {
  const ctx = useContext(PrevisionContext);
  if (!ctx) {
    return {
      tauxJournalier: null,
      dateEpuisement: null,
      joursRestants: null,
      prochainAchatDate: null,
      kwhAchatSuggere: null,
      donneesPrevision: [],
      source: 'fallback',
      loading: false,
      error: null,
    };
  }
  return ctx;
}

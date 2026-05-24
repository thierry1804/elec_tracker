import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../types';
import type { PrevisionResult } from '../context/PrevisionContext';
import { useEmbeddedAi } from '../context/EmbeddedAiContext';
import { buildFullAiContext, hashAiContext } from '../lib/ai/buildContext';
import type { InterpretationResult } from '../lib/ai/parseResponse';
import { getConseilContextuel } from '../lib/conseils';

export interface AiInterpretationState {
  loading: boolean;
  result: InterpretationResult | null;
  fallbackConseil: string | null;
  error: string | null;
}

export function useAiInterpretation(
  data: AppData,
  prevision: PrevisionResult | null
): AiInterpretationState {
  const { isReady, runTask } = useEmbeddedAi();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InterpretationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackConseil = useMemo(
    () => getConseilContextuel(data, prevision),
    [data, prevision]
  );

  const context = useMemo(() => buildFullAiContext(data, prevision), [data, prevision]);
  const contextHash = useMemo(() => hashAiContext(context), [context]);

  useEffect(() => {
    if (!isReady || data.releves.length === 0) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      runTask('interpretation', context, controller.signal)
        .then((taskResult) => {
          if (controller.signal.aborted) return;
          if (taskResult?.task === 'interpretation') {
            setResult(taskResult.result);
          } else {
            setResult(null);
          }
          setLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResult(null);
          setError('Analyse indisponible');
          setLoading(false);
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isReady, contextHash, context, data.releves.length, runTask]);

  return { loading, result, fallbackConseil, error };
}

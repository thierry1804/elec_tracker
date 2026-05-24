import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ModelTier } from '../types';
import { checkWebGpuSupport } from '../lib/ai/webgpu';
import {
  loadEmbeddedAiSettings,
  updateEmbeddedAiSettings,
} from '../lib/ai/embeddedAiSettings';
import {
  clearModelCache,
  loadEmbeddedModel,
  runAiTask,
  setEngineProgressCallback,
  type AiEngineStatus,
  type AiTaskResult,
} from '../lib/ai/engine';
import type { AiTask } from '../lib/ai/prompts';
import type { FullAiContext } from '../lib/ai/buildContext';

export interface AiDownloadProgress {
  progress: number;
  text: string;
}

export interface EmbeddedAiContextValue {
  status: AiEngineStatus;
  webGpuReason: string | null;
  /** WebGPU vérifié et utilisable (téléchargement autorisé). */
  isWebGpuSupported: boolean;
  settings: ReturnType<typeof loadEmbeddedAiSettings>;
  progress: AiDownloadProgress | null;
  error: string | null;
  isReady: boolean;
  setEnabled: (enabled: boolean) => void;
  setModelTier: (tier: ModelTier) => void;
  downloadModel: () => Promise<void>;
  clearModel: () => Promise<void>;
  runTask: (task: AiTask, context: FullAiContext, signal?: AbortSignal) => Promise<AiTaskResult | null>;
}

const EmbeddedAiContext = createContext<EmbeddedAiContextValue | null>(null);

export function EmbeddedAiProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadEmbeddedAiSettings);
  const [status, setStatus] = useState<AiEngineStatus>('checking');
  const [webGpuReason, setWebGpuReason] = useState<string | null>(null);
  const [progress, setProgress] = useState<AiDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webGpuChecked = useRef(false);

  useEffect(() => {
    if (webGpuChecked.current) return;
    webGpuChecked.current = true;
    checkWebGpuSupport().then((support) => {
      if (!support.supported) {
        setStatus('unsupported');
        setWebGpuReason(support.reason);
        if (loadEmbeddedAiSettings().enabled) {
          updateEmbeddedAiSettings({ enabled: false });
          setSettings(loadEmbeddedAiSettings());
        }
        return;
      }
      setStatus('idle');
    });
  }, []);

  useEffect(() => {
    if (
      settings.enabled &&
      settings.downloadedAt &&
      status === 'idle' &&
      webGpuChecked.current
    ) {
      setStatus('downloading');
      loadEmbeddedModel(settings.modelTier)
        .then(() => setStatus('ready'))
        .catch((err) => {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Impossible de charger le modèle');
        });
    }
  }, [settings.enabled, settings.downloadedAt, settings.modelTier, status]);

  useEffect(() => {
    setEngineProgressCallback((report) => {
      setProgress({ progress: report.progress, text: report.text });
    });
    return () => setEngineProgressCallback(null);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    const next = updateEmbeddedAiSettings({ enabled });
    setSettings(next);
  }, []);

  const setModelTier = useCallback((tier: ModelTier) => {
    const next = updateEmbeddedAiSettings({ modelTier: tier, downloadedAt: undefined });
    setSettings(next);
    setStatus((s) => (s === 'ready' ? 'idle' : s));
  }, []);

  const downloadModel = useCallback(async () => {
    if (status === 'checking' || status === 'unsupported') return;
    const support = await checkWebGpuSupport();
    if (!support.supported) {
      setStatus('unsupported');
      setWebGpuReason(support.reason);
      return;
    }
    setError(null);
    setStatus('downloading');
    setProgress(null);
    try {
      await loadEmbeddedModel(settings.modelTier);
      const next = updateEmbeddedAiSettings({
        enabled: true,
        downloadedAt: new Date().toISOString(),
      });
      setSettings(next);
      setStatus('ready');
      setProgress(null);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Échec du téléchargement du modèle');
      setProgress(null);
    }
  }, [settings.modelTier, status]);

  const clearModel = useCallback(async () => {
    setError(null);
    try {
      await clearModelCache(settings.modelTier);
      updateEmbeddedAiSettings({ downloadedAt: undefined });
      setSettings(loadEmbeddedAiSettings());
      setStatus(status === 'unsupported' ? 'unsupported' : 'idle');
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le modèle');
    }
  }, [settings.modelTier, status]);

  const runTaskFn = useCallback(
    async (task: AiTask, context: FullAiContext, signal?: AbortSignal) => {
      if (status !== 'ready' || !settings.enabled) return null;
      setStatus('inferring');
      setError(null);
      try {
        const result = await runAiTask(task, context, signal);
        setStatus('ready');
        return result;
      } catch (err) {
        if (signal?.aborted) {
          setStatus('ready');
          return null;
        }
        setStatus('ready');
        setError(err instanceof Error ? err.message : 'Inférence IA échouée');
        return null;
      }
    },
    [settings.enabled, status]
  );

  const isWebGpuSupported =
    status !== 'checking' && status !== 'unsupported';

  const value = useMemo<EmbeddedAiContextValue>(
    () => ({
      status,
      webGpuReason,
      isWebGpuSupported,
      settings,
      progress,
      error,
      isReady: status === 'ready' && settings.enabled,
      setEnabled,
      setModelTier,
      downloadModel,
      clearModel,
      runTask: runTaskFn,
    }),
    [
      status,
      webGpuReason,
      isWebGpuSupported,
      settings,
      progress,
      error,
      setEnabled,
      setModelTier,
      downloadModel,
      clearModel,
      runTaskFn,
    ]
  );

  return (
    <EmbeddedAiContext.Provider value={value}>{children}</EmbeddedAiContext.Provider>
  );
}

export function useEmbeddedAi(): EmbeddedAiContextValue {
  const ctx = useContext(EmbeddedAiContext);
  if (!ctx) {
    return {
      status: 'checking',
      webGpuReason: null,
      isWebGpuSupported: false,
      settings: loadEmbeddedAiSettings(),
      progress: null,
      error: null,
      isReady: false,
      setEnabled: () => {},
      setModelTier: () => {},
      downloadModel: async () => {},
      clearModel: async () => {},
      runTask: async () => null,
    };
  }
  return ctx;
}

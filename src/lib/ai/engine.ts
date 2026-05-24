import type { InitProgressCallback, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { ModelTier } from '../../types';
import { getModelId } from './models';
import { buildPrompt, type AiTask } from './prompts';
import type { FullAiContext } from './buildContext';
import {
  parsePrevisionResponse,
  parseInterpretationResponse,
  parseReportResponse,
  type InterpretationResult,
  type ReportSynthesisResult,
} from './parseResponse';

export type AiEngineStatus =
  | 'checking'
  | 'unsupported'
  | 'idle'
  | 'downloading'
  | 'ready'
  | 'inferring'
  | 'error';

const INFERENCE_TIMEOUT_MS = 30_000;

export type AiTaskResult =
  | { task: 'prevision'; tauxJournalier: number }
  | { task: 'interpretation'; result: InterpretationResult }
  | { task: 'report'; result: ReportSynthesisResult };

let workerInstance: Worker | null = null;
let engine: WebWorkerMLCEngine | null = null;
let loadedModelId: string | null = null;
let initProgressCallback: InitProgressCallback | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
  }
  return workerInstance;
}

export function setEngineProgressCallback(cb: InitProgressCallback | null): void {
  initProgressCallback = cb;
  if (engine) {
    engine.setInitProgressCallback(cb ?? undefined);
  }
}

export async function loadEmbeddedModel(tier: ModelTier): Promise<void> {
  const modelId = getModelId(tier);
  if (engine && loadedModelId === modelId) return;

  if (engine && loadedModelId && loadedModelId !== modelId) {
    await unloadEmbeddedModel();
  }

  const webllm = await import('@mlc-ai/web-llm');
  const worker = getWorker();
  engine = await webllm.CreateWebWorkerMLCEngine(
    worker,
    modelId,
    {
      appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: 'indexeddb' },
      initProgressCallback: initProgressCallback ?? undefined,
    }
  );
  loadedModelId = modelId;
}

export async function unloadEmbeddedModel(): Promise<void> {
  if (engine) {
    try {
      await engine.unload();
    } catch {
      // ignore
    }
    engine = null;
    loadedModelId = null;
  }
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

export async function clearModelCache(tier: ModelTier): Promise<void> {
  const modelId = getModelId(tier);
  await unloadEmbeddedModel();
  try {
    const { deleteModelInCache } = await import('@mlc-ai/web-llm');
    await deleteModelInCache(modelId);
  } catch {
    // ignore
  }
}

async function chatCompletion(
  system: string,
  user: string,
  maxTokens: number,
  signal?: AbortSignal
): Promise<string> {
  if (!engine) throw new Error('Moteur IA non initialisé');

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => reject(new Error('Délai d’inférence dépassé')), INFERENCE_TIMEOUT_MS);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      engine?.interruptGenerate();
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

  const inferencePromise = engine.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
  });

  const response = await Promise.race([inferencePromise, timeoutPromise]);
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Réponse IA vide');
  return content;
}

export async function runAiTask(
  task: AiTask,
  context: FullAiContext,
  signal?: AbortSignal
): Promise<AiTaskResult | null> {
  const prompt = buildPrompt(task, context);
  if (!prompt) return null;

  const maxTokens = task === 'prevision' ? 80 : task === 'interpretation' ? 250 : 350;
  const content = await chatCompletion(prompt.system, prompt.user, maxTokens, signal);

  if (task === 'prevision') {
    const taux = parsePrevisionResponse(content);
    if (taux == null) return null;
    return { task: 'prevision', tauxJournalier: taux };
  }

  if (task === 'interpretation') {
    const result = parseInterpretationResponse(content);
    if (!result) return null;
    return { task: 'interpretation', result };
  }

  const result = parseReportResponse(content);
  if (!result) return null;
  return { task: 'report', result };
}

export function getLoadedModelId(): string | null {
  return loadedModelId;
}

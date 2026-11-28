import type { ImageLike, Worker } from 'tesseract.js';
import { preprocessVariants, type Raster } from './preprocess';
import { rankCandidates, wordsToCandidates, type IndexCandidate, type OcrWord } from './readIndex';

export interface EngineConfig {
  workerPath: string;
  corePath: string;
  langPath: string;
}

/**
 * Fichiers du moteur servis par notre propre domaine (voir scripts/copy-tesseract-assets.mjs).
 * URLs absolues : le worker les résout depuis son propre emplacement, pas depuis la page.
 */
export function defaultConfig(): EngineConfig {
  const base = new URL(`${import.meta.env.BASE_URL}tesseract`, document.baseURI).href;
  return { workerPath: `${base}/worker.min.js`, corePath: base, langPath: base };
}

let workerPromise: Promise<Worker> | null = null;

/** Crée (une seule fois) le moteur de lecture, chargé à la demande : ~7 Mo, jamais au démarrage de l'app. */
export function getWorker(config: EngineConfig = defaultConfig()): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: config.workerPath,
        corePath: config.corePath,
        langPath: config.langPath,
        workerBlobURL: false,
        gzip: true,
      });
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.,',
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        user_defined_dpi: '300',
      });
      return worker;
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

export async function terminateWorker(): Promise<void> {
  const p = workerPromise;
  workerPromise = null;
  if (p) await (await p.catch(() => null))?.terminate();
}

type Page = Awaited<ReturnType<Worker['recognize']>>['data'];

/** Mots reconnus, à plat, avec leur position. */
export function pageWords(page: Page): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const w of line.words) words.push({ text: w.text, confidence: w.confidence, bbox: w.bbox });
      }
    }
  }
  return words;
}

export interface ReadDeps {
  worker: Pick<Worker, 'recognize'>;
  /** Convertit une image prétraitée en entrée du moteur (canvas dans le navigateur, PNG dans les tests). */
  toImage: (raster: Raster) => ImageLike;
  onProgress?: (step: number, total: number) => void;
}

/** Une lecture est assez sûre pour s'arrêter sans essayer les autres versions de la photo. */
function sureEnough(best: IndexCandidate | undefined, previousIndex: number | null): boolean {
  if (!best || best.confidence < 70) return false;
  if (previousIndex == null) return best.confidence >= 85 && !best.deduced;
  const delta = best.value - previousIndex;
  return delta >= -0.05 && delta <= 500 && !best.deduced;
}

/**
 * Lit l'index sur la photo : essaie la photo contrastée, binarisée, puis inversée, et s'arrête dès qu'une
 * lecture est sûre. Renvoie les lectures classées, la meilleure en premier (liste vide si rien de lisible).
 */
export async function readMeterIndex(
  raster: Raster,
  previousIndex: number | null,
  deps: ReadDeps,
): Promise<IndexCandidate[]> {
  const variants = preprocessVariants(raster);
  const found: ReturnType<typeof wordsToCandidates> = [];
  let ranked: IndexCandidate[] = [];

  for (let i = 0; i < variants.length; i++) {
    deps.onProgress?.(i + 1, variants.length);
    const { data } = await deps.worker.recognize(deps.toImage(variants[i].raster), {}, { blocks: true });
    found.push(...wordsToCandidates(pageWords(data)));
    ranked = rankCandidates(found, previousIndex);
    if (sureEnough(ranked[0], previousIndex)) break;
  }
  return ranked;
}

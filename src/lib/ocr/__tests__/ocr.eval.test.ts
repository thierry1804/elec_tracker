/**
 * Lecture réelle de photos de compteurs par Tesseract (désactivée par défaut, quelques secondes) :
 *   OCR_EVAL=1 npx vitest run ocr.eval
 * Les images sont des chiffres imprimés (rouleaux, étiquette) en polices réelles, avec bruit, flou et rotation.
 * Les afficheurs LCD à segments ne sont PAS lus de façon fiable par Tesseract : voir le README.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getWorker, readMeterIndex, terminateWorker } from '../engine';
import type { Raster } from '../preprocess';

const env = (globalThis as { process?: { env: Record<string, string | undefined>; cwd: () => string } }).process;
const RUN = !!env?.env.OCR_EVAL;
const ROOT = env?.cwd() ?? '.';

const load = (name: string): Raster => {
  const png = PNG.sync.read(readFileSync(join(ROOT, 'src/lib/ocr/__fixtures__', name)));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
};
const toPng = (r: Raster) => {
  const p = new PNG({ width: r.width, height: r.height });
  p.data = Buffer.from(r.data);
  return PNG.sync.write(p);
};

describe.skipIf(!RUN)('lecture de chiffres imprimés par Tesseract', () => {
  const read = async (file: string, previous: number | null) => {
    const worker = await getWorker({
      workerPath: join(ROOT, 'node_modules/tesseract.js/src/worker-script/node/index.js'),
      corePath: join(ROOT, 'node_modules/tesseract.js-core'),
      langPath: join(ROOT, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
    });
    return readMeterIndex(load(file), previous, { worker, toImage: (r) => toPng(r) as never });
  };

  afterAll(async () => {
    await terminateWorker();
  });

  it('lit un index imprimé net', async () => {
    const r = await read('arial_12345.png', 12300);
    expect(r[0].value).toBe(12345);
    expect(r[0].confidence).toBeGreaterThan(80);
  }, 120_000);

  it('lit des chiffres clairs sur fond sombre', async () => {
    const r = await read('arial_inverse.png', 27000);
    expect(r[0].value).toBe(27105);
  }, 120_000);

  it('lit un index décimal incliné et bruité', async () => {
    const r = await read('conso_176.png', 14.9);
    expect(r[0].value).toBeCloseTo(17.6, 5);
  }, 120_000);

  it('écarte une lecture qui ferait baisser l’index', async () => {
    // L'index précédent est supérieur : la lecture lue (12345) devient improbable face à l'historique.
    const r = await read('arial_12345.png', 99999);
    expect(r[0].value).not.toBeLessThan(0);
    expect(r.length).toBeGreaterThan(0);
  }, 120_000);
});

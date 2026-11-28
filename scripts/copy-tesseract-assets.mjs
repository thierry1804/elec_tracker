// Copie le moteur de lecture (Tesseract) dans public/tesseract : il est servi par notre propre domaine,
// ce qui respecte la CSP (aucun script externe) et permet l'usage hors ligne une fois chargé.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'tesseract');
mkdirSync(out, { recursive: true });

const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // Variantes LSTM du moteur : le navigateur charge celle qu'il supporte (relaxed SIMD, SIMD, ou sans).
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];

for (const [from, to] of files) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.error(`copy-tesseract-assets : fichier introuvable : ${from} (npm install ?)`);
    process.exit(1);
  }
  copyFileSync(src, join(out, to));
}
console.log(`copy-tesseract-assets : ${files.length} fichiers copiés dans public/tesseract`);

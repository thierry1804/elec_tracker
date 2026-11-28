import { describe, it, expect } from 'vitest';
import {
  binarizeTextBlack,
  grayToRaster,
  invertGray,
  otsuThreshold,
  padRaster,
  preprocessVariants,
  stretchContrast,
  toGrayscale,
  type Raster,
} from '../preprocess';

const raster = (w: number, h: number, fill: (x: number, y: number) => [number, number, number]): Raster => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return { data, width: w, height: h };
};

/** Fond clair, bande de « chiffres » sombre au centre. */
const sombreSurClair = raster(40, 20, (x) => (x >= 15 && x < 25 ? [30, 30, 30] : [200, 200, 200]));

describe('toGrayscale', () => {
  it('convertit en niveaux de gris pondérés', () => {
    const g = toGrayscale(raster(2, 1, (x) => (x === 0 ? [255, 255, 255] : [0, 0, 0])));
    expect(Array.from(g)).toEqual([255, 0]);
  });
});

describe('stretchContrast', () => {
  it('étire une plage étroite sur 0-255', () => {
    const out = stretchContrast(Uint8ClampedArray.from({ length: 100 }, (_, i) => 100 + (i % 20)));
    expect(Math.min(...out)).toBe(0);
    expect(Math.max(...out)).toBe(255);
  });

  it('laisse une image uniforme inchangée', () => {
    const g = new Uint8ClampedArray(50).fill(120);
    expect(Array.from(stretchContrast(g))).toEqual(Array.from(g));
  });
});

describe('otsuThreshold et binarizeTextBlack', () => {
  const gray = toGrayscale(sombreSurClair);

  it('place le seuil entre le fond et les chiffres', () => {
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(200);
  });

  it('met le texte (minoritaire) en noir sur fond blanc, quelle que soit la polarité', () => {
    const direct = binarizeTextBlack(gray);
    expect(direct[0]).toBe(255);
    expect(direct[20]).toBe(0);
    const inverse = binarizeTextBlack(invertGray(gray));
    expect(inverse[0]).toBe(255);
    expect(inverse[20]).toBe(0);
  });
});

describe('padRaster', () => {
  it('ajoute une marge blanche autour de l’image', () => {
    const r = grayToRaster(new Uint8ClampedArray(4).fill(0), 2, 2);
    const p = padRaster(r, 3);
    expect(p.width).toBe(8);
    expect(p.height).toBe(8);
    expect(p.data[0]).toBe(255);
    expect(p.data[(3 * 8 + 3) * 4]).toBe(0);
  });
});

describe('preprocessVariants', () => {
  it('produit trois versions de même taille, avec marge', () => {
    const v = preprocessVariants(sombreSurClair);
    expect(v.map((x) => x.name)).toEqual(['contraste', 'binarise', 'inverse']);
    for (const x of v) {
      expect(x.raster.width).toBeGreaterThan(sombreSurClair.width);
      expect(x.raster.data.length).toBe(x.raster.width * x.raster.height * 4);
    }
  });
});

/** Image RGBA, comme ImageData (utilisable sans navigateur pour les tests). */
export interface Raster {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function toGrayscale(r: Raster): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(r.width * r.height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = Math.round(0.299 * r.data[p] + 0.587 * r.data[p + 1] + 0.114 * r.data[p + 2]);
  }
  return gray;
}

/** Étire le contraste entre les 2 % les plus sombres et les 2 % les plus clairs (compense reflets et pénombre). */
export function stretchContrast(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray) hist[v]++;
  const cut = gray.length * 0.02;
  let lo = 0;
  let hi = 255;
  for (let acc = 0, v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc > cut) {
      lo = v;
      break;
    }
  }
  for (let acc = 0, v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc > cut) {
      hi = v;
      break;
    }
  }
  const out = new Uint8ClampedArray(gray.length);
  if (hi - lo < 8) return gray.slice();
  const scale = 255 / (hi - lo);
  for (let i = 0; i < gray.length; i++) out[i] = Math.round((gray[i] - lo) * scale);
  return out;
}

/** Seuil de Otsu : sépare au mieux deux populations de gris (chiffres / fond). */
export function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray) hist[v]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Noir et blanc, avec le texte (population minoritaire) en noir sur fond blanc, ce qu'attend Tesseract. */
export function binarizeTextBlack(gray: Uint8ClampedArray): Uint8ClampedArray {
  const t = otsuThreshold(gray);
  let dark = 0;
  for (const v of gray) if (v <= t) dark++;
  const textIsDark = dark <= gray.length / 2;
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const isDark = gray[i] <= t;
    out[i] = isDark === textIsDark ? 0 : 255;
  }
  return out;
}

export function invertGray(gray: Uint8ClampedArray): Uint8ClampedArray {
  return gray.map((v) => 255 - v);
}

export function grayToRaster(gray: Uint8ClampedArray, width: number, height: number): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    data[p] = data[p + 1] = data[p + 2] = gray[i];
    data[p + 3] = 255;
  }
  return { data, width, height };
}

/** Marge blanche autour de l'image : Tesseract lit mal les chiffres collés au bord. */
export function padRaster(r: Raster, margin: number, value = 255): Raster {
  const width = r.width + margin * 2;
  const height = r.height + margin * 2;
  const data = new Uint8ClampedArray(width * height * 4).fill(value);
  for (let y = 0; y < r.height; y++) {
    const src = y * r.width * 4;
    const dst = ((y + margin) * width + margin) * 4;
    data.set(r.data.subarray(src, src + r.width * 4), dst);
  }
  return { data, width, height };
}

export interface Variant {
  name: string;
  raster: Raster;
}

/**
 * Plusieurs versions de la même photo, essayées dans l'ordre : afficheur LCD sombre sur fond clair,
 * binarisé, puis chiffres clairs sur fond sombre (rouleaux, rétroéclairage).
 */
export function preprocessVariants(r: Raster): Variant[] {
  const gray = stretchContrast(toGrayscale(r));
  const make = (name: string, g: Uint8ClampedArray): Variant => ({
    name,
    raster: padRaster(grayToRaster(g, r.width, r.height), Math.round(Math.min(r.width, r.height) * 0.04)),
  });
  return [make('contraste', gray), make('binarise', binarizeTextBlack(gray)), make('inverse', invertGray(gray))];
}

export interface WebGpuSupport {
  supported: boolean;
  reason: string | null;
}

export async function checkWebGpuSupport(): Promise<WebGpuSupport> {
  if (typeof navigator === 'undefined') {
    return { supported: false, reason: 'Environnement non navigateur.' };
  }
  if (!('gpu' in navigator)) {
    return {
      supported: false,
      reason: 'WebGPU non disponible. Utilisez Chrome ou Edge récent.',
    };
  }
  try {
    const gpu = (navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<{ info?: unknown } | null> };
    }).gpu;
    if (!gpu) {
      return {
        supported: false,
        reason: 'Aucun adaptateur graphique compatible détecté.',
      };
    }
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'Aucun adaptateur graphique compatible détecté.',
      };
    }
    return { supported: true, reason: null };
  } catch {
    return {
      supported: false,
      reason: 'Impossible d’initialiser WebGPU sur cet appareil.',
    };
  }
}

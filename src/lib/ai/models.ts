import type { ModelTier } from '../../types';

export interface ModelInfo {
  id: string;
  label: string;
  sizeLabel: string;
}

export const MODELS: Record<ModelTier, ModelInfo> = {
  light: {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Léger',
    sizeLabel: '~300 Mo',
  },
  balanced: {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Équilibré',
    sizeLabel: '~900 Mo',
  },
};

export const DEFAULT_MODEL_TIER: ModelTier = 'light';

export function getModelId(tier: ModelTier): string {
  return MODELS[tier].id;
}

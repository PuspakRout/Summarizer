import { env } from '@huggingface/transformers';

export const MODEL_ID = 'onnx-community/granite-docling-258M-ONNX';

export const MODEL_DTYPE = {
  embed_tokens: 'fp16',
  vision_encoder: 'fp32',
  decoder_model_merged: 'fp32',
};

export function configureModelEnvironment() {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = true;
  env.localModelPath = `${import.meta.env.BASE_URL}models/`;
}

export function getDevice() {
  return typeof navigator !== 'undefined' && navigator.gpu ? 'webgpu' : 'wasm';
}

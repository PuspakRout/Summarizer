import { AutoProcessor, AutoModelForVision2Seq } from '@huggingface/transformers';

import {
  MODEL_DTYPE,
  MODEL_ID,
  configureModelEnvironment,
  getDevice,
} from '../lib/model-env.js';

configureModelEnvironment();

class ModelLoader {
  static instance = null;

  static async getInstance(progressCallback) {
    if (!this.instance) {
      const processor = await AutoProcessor.from_pretrained(MODEL_ID, {
        progress_callback: progressCallback,
      });

      const progress = {};
      const model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: MODEL_DTYPE,
        device: getDevice(),
        progress_callback: (data) => {
          if (data.status === 'progress' && data.file?.endsWith?.('onnx_data')) {
            progress[data.file] = data;
            if (Object.keys(progress).length === 3) {
              let loaded = 0;
              let total = 0;
              for (const entry of Object.values(progress)) {
                loaded += entry.loaded;
                total += entry.total;
              }
              progressCallback?.({
                status: 'progress',
                file: 'model weights',
                loaded,
                total,
              });
            }
          } else {
            progressCallback?.(data);
          }
        },
      });

      this.instance = { processor, model };
    }

    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type } = event.data;

  if (type !== 'LOAD') {
    return;
  }

  try {
    await ModelLoader.getInstance((progress) => {
      self.postMessage({ type: 'PROGRESS', progress });
    });
    self.postMessage({ type: 'LOAD_COMPLETE' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = message.includes('404') || message.includes('fetch')
      ? `${message}. Run "npm run download-model" to fetch local model files.`
      : message;

    self.postMessage({
      type: 'ERROR',
      error: hint,
    });
  }
});

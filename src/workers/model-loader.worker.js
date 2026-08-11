import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/distilbart-cnn-6-6';

env.allowLocalModels = false;
env.useBrowserCache = true;

class ModelLoader {
  static instance = null;

  static async load(progressCallback) {
    if (!this.instance) {
      this.instance = await pipeline('summarization', MODEL_ID, {
        progress_callback: progressCallback,
      });
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
    await ModelLoader.load((progress) => {
      self.postMessage({ type: 'PROGRESS', progress });
    });

    self.postMessage({ type: 'LOAD_COMPLETE' });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Failed to load model',
    });
  }
});

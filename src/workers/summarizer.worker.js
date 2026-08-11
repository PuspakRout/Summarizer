import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/distilbart-cnn-6-6';

env.allowLocalModels = false;
env.useBrowserCache = true;

class Summarizer {
  static instance = null;

  static async getInstance() {
    if (!this.instance) {
      self.postMessage({ type: 'STATUS', message: 'Initializing model for inference…' });
      this.instance = await pipeline('summarization', MODEL_ID);
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, text, options } = event.data;

  if (type !== 'SUMMARIZE') {
    return;
  }

  if (!text?.trim()) {
    self.postMessage({ type: 'ERROR', error: 'Please enter some text to summarize.' });
    return;
  }

  try {
    self.postMessage({ type: 'GENERATION_START' });

    const summarizer = await Summarizer.getInstance();
    const result = await summarizer(text.trim(), {
      max_new_tokens: options?.maxLength ?? 130,
      min_length: options?.minLength ?? 30,
    });

    self.postMessage({
      type: 'GENERATION_COMPLETE',
      summary: result[0]?.summary_text ?? '',
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Summarization failed',
    });
  }
});

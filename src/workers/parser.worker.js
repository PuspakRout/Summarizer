import { AutoProcessor, AutoModelForVision2Seq, RawImage } from '@huggingface/transformers';

import {
  MODEL_DTYPE,
  MODEL_ID,
  configureModelEnvironment,
  getDevice,
} from '../lib/model-env.js';

const PROMPT = 'Convert this page to docling.';

configureModelEnvironment();

class DocumentParser {
  static instance = null;

  static async getInstance() {
    if (!this.instance) {
      const processor = await AutoProcessor.from_pretrained(MODEL_ID);
      const model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        dtype: MODEL_DTYPE,
        device: getDevice(),
      });
      this.instance = { processor, model };
    }

    return this.instance;
  }

  static async parsePage(bitmap) {
    const { processor, model } = await this.getInstance();
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const image = RawImage.fromCanvas(canvas);

    const messages = [
      {
        role: 'user',
        content: [{ type: 'image' }, { type: 'text', text: PROMPT }],
      },
    ];

    const text = processor.apply_chat_template(messages, {
      add_generation_prompt: true,
    });
    const inputs = await processor(text, [image], {
      do_image_splitting: true,
    });

    const generatedIds = await model.generate({
      ...inputs,
      max_new_tokens: 4096,
    });

    const promptLength = inputs.input_ids.dims.at(-1);
    const generatedText = processor.batch_decode(
      generatedIds.slice(null, [promptLength, null]),
      { skip_special_tokens: false },
    )[0];

    return generatedText.replace(/<\|end_of_text\|>$/, '').trim();
  }
}

self.addEventListener('message', async (event) => {
  const { type, bitmap, pageNumber } = event.data;

  if (type !== 'PARSE') {
    return;
  }

  try {
    self.postMessage({ type: 'PARSE_START', pageNumber });
    const doctags = await DocumentParser.parsePage(bitmap);
    self.postMessage({ type: 'PARSE_COMPLETE', pageNumber, doctags });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      pageNumber,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    bitmap.close?.();
  }
});

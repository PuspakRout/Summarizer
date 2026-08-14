import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODEL_ID = 'onnx-community/granite-docling-258M-ONNX';
const OUT_DIR = path.join(ROOT, 'public', 'models', MODEL_ID);
const HF_BASE = `https://huggingface.co/${MODEL_ID}/resolve/main`;

const FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'processor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'vocab.json',
  'merges.txt',
  'added_tokens.json',
  'chat_template.jinja',
  'onnx/embed_tokens_fp16.onnx',
  'onnx/embed_tokens_fp16.onnx_data',
  'onnx/vision_encoder.onnx',
  'onnx/vision_encoder.onnx_data',
  'onnx/decoder_model_merged.onnx',
  'onnx/decoder_model_merged.onnx_data',
];

async function downloadFile(relativePath) {
  const dest = path.join(OUT_DIR, relativePath);

  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`Skipping ${relativePath} (already exists)`);
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const url = `${HF_BASE}/${relativePath}`;
  console.log(`Downloading ${relativePath}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log(`Saved ${relativePath} (${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`);
}

console.log(`Downloading ${MODEL_ID} to ${OUT_DIR}`);
for (const file of FILES) {
  await downloadFile(file);
}
console.log('Model download complete.');

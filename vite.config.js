import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  assetsInclude: ['**/*.onnx', '**/*.onnx_data'],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
});

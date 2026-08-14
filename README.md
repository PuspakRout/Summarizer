# Document Parser

A fully client-side document parser that runs OCR in your browser. Upload an image or PDF, extract structured text as markdown, and download the result. No server and no API keys — your files never leave your device.

Built with [Transformers.js](https://github.com/huggingface/transformers.js) and the [Granite Docling 258M](https://huggingface.co/onnx-community/granite-docling-258M-ONNX) vision model (ONNX). Model files are **bundled locally** in `public/models/` — the browser does not download weights from Hugging Face at runtime.

## Features

- **100% client-side** — runs entirely in the browser
- **Local model files** — OCR weights served from `public/models/` (no Hugging Face download in the browser)
- **Web Workers** — model loading and OCR run in background workers so the UI stays responsive
- **PDF & image support** — PNG, JPG, WEBP, TIFF, BMP, GIF, and PDF (first 20 pages)
- **Markdown output** — headings, tables, formulas, and code blocks
- **Download** — save results as a `.md` file or copy to clipboard
- **GitHub Pages & Firebase ready** — static build with automated deployment

## Architecture

```
Main Thread (UI)
    │
    ├── model-loader.worker.js  → downloads & caches the OCR model
    │
    └── parser.worker.js        → runs OCR on each page/image
            │
            └── DocTags → HTML → Markdown
```

PDF pages are rendered to images in the main thread with PDF.js, then sent to the parser worker one page at a time.

## Local Development

### 1. Download model files (one-time, ~1.1 GB)

```bash
npm install
npm run download-model
```

This saves the required ONNX weights and tokenizer files to:

```
public/models/onnx-community/granite-docling-258M-ONNX/
```

`npm run build` runs this automatically if files are missing.

### 2. Start the app

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

> **Note:** WebGPU (Chrome/Edge 113+) is recommended for faster inference.

## Build for Production

```bash
npm run build
npm run preview
```

## Usage

1. Click **Load Model** and wait for the download to complete
2. Upload a PDF or image (drag-and-drop or browse)
3. Click **Parse to Markdown**
4. Preview the result, then **Download .md** or copy to clipboard

## Browser Support

Works in modern browsers with WebAssembly support. WebGPU accelerates OCR on supported browsers (Chrome, Edge 113+). Falls back to WASM elsewhere.

First load reads model files from the local bundle. Subsequent visits may use the browser cache.

## Deploy to GitHub Pages / Firebase

The same static deployment workflow applies. Push to `main` and the workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

## License

MIT

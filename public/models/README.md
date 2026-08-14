# Local model files

The OCR model is loaded from this folder at runtime (no Hugging Face download in the browser).

Run once from the project root:

```bash
npm run download-model
```

Files are stored under:

```
public/models/onnx-community/granite-docling-258M-ONNX/
```

The production build copies this folder into `dist/models/`.

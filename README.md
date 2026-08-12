# Text Summarizer

A fully client-side text summarizer that runs a Hugging Face model in your browser. No server, no API keys — your text never leaves your device.

Built with [Transformers.js](https://github.com/huggingface/transformers.js) and the [Xenova/distilbart-cnn-6-6](https://huggingface.co/Xenova/distilbart-cnn-6-6) summarization model.

## Features

- **100% client-side** — runs entirely in the browser
- **Web Workers** — model loading and text generation run in separate background workers so the UI stays responsive
- **GitHub Pages & Firebase ready** — static build with automated deployment to both platforms
- **Private by design** — no data is sent to any server

## Architecture

```
Main Thread (UI)
    │
    ├── model-loader.worker.js  → downloads & caches the model
    │
    └── summarizer.worker.js    → runs inference on your text
```

The loader worker downloads model weights into the browser cache. The summarizer worker loads from cache and generates summaries independently, keeping heavy computation off the main thread.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

> **Note:** The model is ~300 MB and downloads on first load. Subsequent visits use the browser cache.

## Build for Production

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Push this repo to GitHub (e.g. `username/Summarizer`)
2. Go to **Settings → Pages → Build and deployment**
3. Set **Source** to **GitHub Actions**
4. Push to the `main` branch — the workflow in `.github/workflows/deploy.yml` builds and deploys automatically

Your app will be live at `https://<username>.github.io/Summarizer/`.

The build uses relative asset paths (`base: './'`) so the same output works on both GitHub Pages and Firebase.

## Deploy to Firebase Hosting

The same workflow also deploys to Firebase Hosting on every push to `main`.

### One-time setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firebase Hosting** for the project
3. Set your Firebase project ID via the `FIREBASE_PROJECT_ID` GitHub secret
4. Create a Firebase service account:
   - **Project settings → Service accounts → Generate new private key**
5. Add these GitHub repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Description |
|--------|-------------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID (e.g. `my-summarizer-app`) |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON contents of the service account key file |

### How it works

- **`build`** — runs `npm ci` and `npm run build` once, uploads `dist` as an artifact
- **`github-pages`** and **`firebase`** — download the same artifact and deploy in parallel

Your Firebase app will be live at `https://<project-id>.web.app`.

### Manual deploy (optional)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

## Usage

1. Click **Load Model** and wait for the download to complete
2. Paste or type text in the input area
3. Adjust max/min length if needed
4. Click **Summarize**

## Browser Support

Works in modern browsers with WebAssembly support (Chrome, Firefox, Edge, Safari 16+). First load requires an internet connection to download the model.

## License

MIT
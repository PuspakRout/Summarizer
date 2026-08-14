import { doclingToMarkdown, normalizeDoclingOutput } from './lib/docling-markdown.js';
import { fileToPageBitmaps, getPdfPageLimitMessage } from './lib/pdf-pages.js';

const modelStatus = document.getElementById('model-status');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const loadModelBtn = document.getElementById('load-model-btn');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const browseBtn = document.getElementById('browse-btn');
const fileInfo = document.getElementById('file-info');
const filePreview = document.getElementById('file-preview');
const fileNameEl = document.getElementById('file-name');
const clearFileBtn = document.getElementById('clear-file-btn');
const parseBtn = document.getElementById('parse-btn');
const outputArea = document.getElementById('output-area');
const outputActions = document.getElementById('output-actions');
const processingStatus = document.getElementById('processing-status');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');

let modelLoaded = false;
let isProcessing = false;
let selectedFile = null;
let markdownResult = '';
let downloadBaseName = 'document';

const loaderWorker = new Worker(
  new URL('./workers/model-loader.worker.js', import.meta.url),
  { type: 'module' },
);

const parserWorker = new Worker(
  new URL('./workers/parser.worker.js', import.meta.url),
  { type: 'module' },
);

function setModelStatus(status, label) {
  modelStatus.className = `status-badge status-${status}`;
  modelStatus.textContent = label;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatProgress(progress) {
  if (progress.status === 'progress' && progress.total) {
    const pct = Math.round((progress.loaded / progress.total) * 100);
    return { pct, text: `Loading ${progress.file ?? 'model files'}… ${pct}%` };
  }

  if (progress.status === 'done') {
    return { pct: 100, text: 'Finalizing…' };
  }

  if (progress.status === 'initiate') {
    return { pct: 0, text: `Preparing: ${progress.file ?? 'model'}` };
  }

  return { pct: null, text: progress.status ?? 'Loading local model…' };
}

function showError(message) {
  outputArea.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;
  outputActions.classList.add('hidden');
}

function showMarkdown(text) {
  outputArea.innerHTML = `<pre class="markdown-output">${escapeHtml(text)}</pre>`;
  outputActions.classList.remove('hidden');
}

function updateParseButton() {
  parseBtn.disabled = !modelLoaded || isProcessing || !selectedFile;
}

function setSelectedFile(file) {
  selectedFile = file;
  markdownResult = '';

  if (!file) {
    fileInfo.textContent = 'No file selected';
    filePreview.classList.add('hidden');
    dropZone.classList.remove('hidden');
    outputActions.classList.add('hidden');
    outputArea.innerHTML =
      '<p class="placeholder">Parsed markdown will appear here after you load the model, upload a document, and click Parse.</p>';
    updateParseButton();
    return;
  }

  const pageLimitMessage = getPdfPageLimitMessage(file);
  fileInfo.textContent = pageLimitMessage
    ? `${formatFileSize(file.size)} · ${pageLimitMessage}`
    : formatFileSize(file.size);
  fileNameEl.textContent = file.name;
  filePreview.classList.remove('hidden');
  dropZone.classList.add('hidden');
  downloadBaseName = file.name.replace(/\.[^.]+$/, '') || 'document';
  updateParseButton();
}

function parsePageWithWorker(bitmap, pageNumber) {
  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      const { type, doctags, error } = event.data;
      if (event.data.pageNumber !== pageNumber) {
        return;
      }

      if (type === 'PARSE_COMPLETE') {
        parserWorker.removeEventListener('message', handleMessage);
        resolve(doctags);
      }

      if (type === 'ERROR') {
        parserWorker.removeEventListener('message', handleMessage);
        reject(new Error(error ?? 'Failed to parse page'));
      }
    };

    parserWorker.addEventListener('message', handleMessage);
    parserWorker.postMessage({ type: 'PARSE', bitmap, pageNumber }, [bitmap]);
  });
}

async function parseDocument() {
  if (!selectedFile || !modelLoaded || isProcessing) {
    return;
  }

  isProcessing = true;
  processingStatus.classList.remove('hidden');
  outputActions.classList.add('hidden');
  outputArea.innerHTML = '';
  updateParseButton();

  try {
    const pages = await fileToPageBitmaps(selectedFile);
    const markdownPages = [];

    for (const { pageNumber, bitmap } of pages) {
      processingStatus.querySelector('span').textContent =
        pages.length > 1
          ? `Running OCR on page ${pageNumber} of ${pages.length}…`
          : 'Running OCR… this may take a minute.';

      const doctags = await parsePageWithWorker(bitmap, pageNumber);
      const markdown = doclingToMarkdown(normalizeDoclingOutput(doctags));

      if (pages.length > 1) {
        markdownPages.push(`## Page ${pageNumber}\n\n${markdown}`.trim());
      } else {
        markdownPages.push(markdown);
      }
    }

    markdownResult = markdownPages.filter(Boolean).join('\n\n---\n\n');
    if (!markdownResult.trim()) {
      throw new Error('No text could be extracted from the document');
    }

    showMarkdown(markdownResult);
  } catch (error) {
    showError(error.message ?? 'Failed to parse document');
  } finally {
    isProcessing = false;
    processingStatus.classList.add('hidden');
    updateParseButton();
  }
}

function downloadMarkdown() {
  if (!markdownResult) return;

  const blob = new Blob([markdownResult], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${downloadBaseName}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

loaderWorker.addEventListener('message', (event) => {
  const { type, progress, error } = event.data;

  switch (type) {
    case 'PROGRESS': {
      const { pct, text } = formatProgress(progress);
      progressContainer.classList.remove('hidden');
      if (pct !== null) {
        progressFill.style.width = `${pct}%`;
      }
      progressText.textContent = text;
      break;
    }
    case 'LOAD_COMPLETE':
      modelLoaded = true;
      progressFill.style.width = '100%';
      progressText.textContent = 'Model ready';
      setModelStatus('ready', 'Ready');
      loadModelBtn.disabled = true;
      loadModelBtn.textContent = 'Model Loaded';
      updateParseButton();
      setTimeout(() => progressContainer.classList.add('hidden'), 1500);
      break;
    case 'ERROR':
      setModelStatus('error', 'Error');
      progressText.textContent = error;
      loadModelBtn.disabled = false;
      showError(`Model loading failed: ${error}`);
      break;
  }
});

loadModelBtn.addEventListener('click', () => {
  setModelStatus('loading', 'Loading');
  loadModelBtn.disabled = true;
  progressContainer.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting…';
  loaderWorker.postMessage({ type: 'LOAD' });
});

browseBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) {
    setSelectedFile(file);
  }
});

clearFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  setSelectedFile(null);
});

parseBtn.addEventListener('click', parseDocument);

copyBtn.addEventListener('click', async () => {
  if (!markdownResult) return;

  try {
    await navigator.clipboard.writeText(markdownResult);
    copyBtn.title = 'Copied!';
    setTimeout(() => {
      copyBtn.title = 'Copy markdown';
    }, 2000);
  } catch {
    showError('Could not copy to clipboard.');
  }
});

downloadBtn.addEventListener('click', downloadMarkdown);

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drop-zone-active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone-active');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drop-zone-active');
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    setSelectedFile(file);
  }
});

setModelStatus('idle', 'Not loaded');
updateParseButton();

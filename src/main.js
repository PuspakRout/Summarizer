const modelStatus = document.getElementById('model-status');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const loadModelBtn = document.getElementById('load-model-btn');
const inputText = document.getElementById('input-text');
const charCount = document.getElementById('char-count');
const maxLengthInput = document.getElementById('max-length');
const minLengthInput = document.getElementById('min-length');
const summarizeBtn = document.getElementById('summarize-btn');
const outputArea = document.getElementById('output-area');
const generationStatus = document.getElementById('generation-status');
const copyBtn = document.getElementById('copy-btn');

let modelLoaded = false;
let isGenerating = false;

const loaderWorker = new Worker(
  new URL('./workers/model-loader.worker.js', import.meta.url),
  { type: 'module' }
);

const summarizerWorker = new Worker(
  new URL('./workers/summarizer.worker.js', import.meta.url),
  { type: 'module' }
);

function setModelStatus(status, label) {
  modelStatus.className = `status-badge status-${status}`;
  modelStatus.textContent = label;
}

function formatProgress(progress) {
  if (progress.status === 'progress' && progress.total) {
    const pct = Math.round((progress.loaded / progress.total) * 100);
    return { pct, text: `Downloading ${progress.file ?? 'model files'}… ${pct}%` };
  }

  if (progress.status === 'done') {
    return { pct: 100, text: 'Finalizing…' };
  }

  if (progress.status === 'initiate') {
    return { pct: 0, text: `Starting download: ${progress.file ?? 'model'}` };
  }

  return { pct: null, text: progress.status ?? 'Loading…' };
}

function showError(message) {
  outputArea.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;
  copyBtn.classList.add('hidden');
}

function showSummary(text) {
  outputArea.innerHTML = `<p class="summary-text">${escapeHtml(text)}</p>`;
  copyBtn.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateCharCount() {
  const length = inputText.value.length;
  charCount.textContent = `${length.toLocaleString()} character${length === 1 ? '' : 's'}`;
}

function updateSummarizeButton() {
  summarizeBtn.disabled = !modelLoaded || isGenerating || !inputText.value.trim();
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
      updateSummarizeButton();
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

summarizerWorker.addEventListener('message', (event) => {
  const { type, summary, error, message } = event.data;

  switch (type) {
    case 'STATUS':
      generationStatus.classList.remove('hidden');
      generationStatus.querySelector('span').textContent = message;
      break;
    case 'GENERATION_START':
      isGenerating = true;
      generationStatus.classList.remove('hidden');
      generationStatus.querySelector('span').textContent = 'Generating summary…';
      updateSummarizeButton();
      break;
    case 'GENERATION_COMPLETE':
      isGenerating = false;
      generationStatus.classList.add('hidden');
      showSummary(summary);
      updateSummarizeButton();
      break;
    case 'ERROR':
      isGenerating = false;
      generationStatus.classList.add('hidden');
      showError(error);
      updateSummarizeButton();
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

summarizeBtn.addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text || !modelLoaded || isGenerating) {
    return;
  }

  outputArea.innerHTML = '';
  copyBtn.classList.add('hidden');

  summarizerWorker.postMessage({
    type: 'SUMMARIZE',
    text,
    options: {
      maxLength: Number(maxLengthInput.value) || 130,
      minLength: Number(minLengthInput.value) || 30,
    },
  });
});

inputText.addEventListener('input', () => {
  updateCharCount();
  updateSummarizeButton();
});

copyBtn.addEventListener('click', async () => {
  const summaryEl = outputArea.querySelector('.summary-text');
  if (!summaryEl) {
    return;
  }

  try {
    await navigator.clipboard.writeText(summaryEl.textContent);
    copyBtn.title = 'Copied!';
    setTimeout(() => {
      copyBtn.title = 'Copy summary';
    }, 2000);
  } catch {
    showError('Could not copy to clipboard.');
  }
});

updateCharCount();
updateSummarizeButton();

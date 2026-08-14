import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MAX_PDF_PAGES = 20;
const PDF_RENDER_SCALE = 2;

export async function fileToPageBitmaps(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return renderPdfPages(file);
  }

  const bitmap = await createImageBitmap(file);
  return [{ pageNumber: 1, bitmap }];
}

async function renderPdfPages(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const bitmap = await createImageBitmap(canvas);
    pages.push({ pageNumber, bitmap });
  }

  return pages;
}

export function getPdfPageLimitMessage(file) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return null;
  }

  return `PDFs are limited to the first ${MAX_PDF_PAGES} pages in the browser.`;
}

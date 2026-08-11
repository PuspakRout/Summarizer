import { defineConfig } from 'vite';

// Set base to your repo name for GitHub Pages, or '/' for custom domain
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Summarizer/' : '/',
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
});

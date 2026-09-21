import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': path.dirname(fileURLToPath(import.meta.url)) } },
});

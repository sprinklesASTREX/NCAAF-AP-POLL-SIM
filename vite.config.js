import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { open: '/app.html' },
  build: { rollupOptions: { input: 'app.html' } }
});

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  },
  // Configure multiple entry points
  appType: 'mpa', // Multi-page application
  // Define the entry points
  root: '.',
  publicDir: 'public'
}); 
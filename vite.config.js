import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173 // changed from 3000 becauser server is running on 3000
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        desktop: './desktop.html'
      }
    }
  },
  // Configure multiple entry points
  appType: 'mpa', // Multi-page application
  // Define the entry points
  root: '.',
  publicDir: 'public',
  optimizeDeps: {
    include: ['socket.io-client']
  },
  resolve: {
    dedupe: ['socket.io-client']
  }
}); 
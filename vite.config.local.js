import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Determine base path based on environment
const isProduction = process.env.NODE_ENV === 'production';
const basePath = isProduction ? './' : '/';

export default defineConfig({
  plugins: [svelte()],
  base: basePath,
  mode: isProduction ? 'production' : 'development',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  publicDir: 'static',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
})
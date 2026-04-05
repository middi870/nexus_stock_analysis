import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NEXUS — Vite configuration
// In development, /api proxies to the local FastAPI backend.
// In production (Railway), set VITE_API_URL to the backend service URL.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target:      process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        rewrite:     path => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir:    'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom'],
          recharts: ['recharts'],
        },
      },
    },
  },
  define: {
    // Expose backend URL to the app at build time (optional)
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || '/api'),
  },
})

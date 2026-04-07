import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Serve files from public/ at root (manifest.json, sw.js, icons)
  publicDir: 'public',

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target:       process.env.VITE_API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        rewrite:      path => path.replace(/^\/api/, ''),
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
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || '/api'),
  },
})

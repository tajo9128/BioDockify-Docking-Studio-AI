import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['bowser', 'plotly.js', 'react-plotly.js', 'ketcher-core', 'ketcher-react', 'ketcher-standalone'],
    exclude: [],
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ketcher: ['ketcher-core', 'ketcher-standalone', 'ketcher-react'],
          plotly: ['plotly.js', 'react-plotly.js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/dock': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/jobs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/security': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/gpu': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ollama': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/rmsd': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/binding-site': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/download': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/llm': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/pharmacophore': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/rdkit': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

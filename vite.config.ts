import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    // Gera source maps para facilitar depuração em produção
    sourcemap: false,
  },
})

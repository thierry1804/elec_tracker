import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'API n'a pas de préfixe : en dev, /__api est proxifié vers l'API locale (même origine, donc cookie de session).
// Pas d'en-têtes COOP/COEP : ils bloquent la fenêtre de connexion Google.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/__api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://127.0.0.1:8000',
        rewrite: (path) => path.replace(/^\/__api/, ''),
      },
    },
  },
})

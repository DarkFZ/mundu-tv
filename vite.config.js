import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Versão da publicação (commit na Vercel): entra no endereço do catálogo para
// que cada publicação use uma cópia nova, e não a que está em cache
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 12)

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
  },
})

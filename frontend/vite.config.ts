import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// For GitHub Pages: set VITE_BASE_URL=/repo-name/ and VITE_USE_STATIC=true
const base = process.env.VITE_BASE_URL ?? '/';
export default defineConfig({
  plugins: [react()],
  base,
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/api/minimaps': 'http://127.0.0.1:8000' } },
})

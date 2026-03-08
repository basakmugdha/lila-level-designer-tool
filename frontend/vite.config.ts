import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages: build:pages uses --base=./ so assets load from repo path
const base = process.env.VITE_BASE_URL ?? '/';
export default defineConfig({
  plugins: [react()],
  base,
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/api/minimaps': 'http://127.0.0.1:8000' } },
})

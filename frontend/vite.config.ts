import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages: use relative base so assets load at /repo-name/assets/...
const base = process.env.VITE_BASE_URL || (process.env.NODE_ENV === 'production' ? './' : '/');
export default defineConfig({
  plugins: [react()],
  base,
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/api/minimaps': 'http://127.0.0.1:8000' } },
})

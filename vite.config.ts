import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.SITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 47331,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    host: '0.0.0.0',
    port: 47331,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
})

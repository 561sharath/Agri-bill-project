import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      // All /api/* requests go to the backend (5002). Frontend stays on 5175.
      '/api': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[Vite proxy]', req.method, req.url, '->', 'http://127.0.0.1:5002' + req.url);
            }
          });
        },
      },
    },
  },
})

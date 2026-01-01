import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        configure: (proxy, _options) => {
          // Suppress harmless WebSocket errors
          proxy.on('error', (err: NodeJS.ErrnoException, _req, _res) => {
            if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') {
              // Silently ignore these errors - they're normal when clients disconnect
              return;
            }
            console.error('Proxy error:', err);
          });
        },
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
  },
})

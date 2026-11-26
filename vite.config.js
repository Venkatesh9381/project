import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Loopback only by default: the dev server is not reachable from other devices on the network.
    // To expose it deliberately, run `npm run dev -- --host <address>`.
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true } }
  }
});

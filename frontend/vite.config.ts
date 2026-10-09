import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    host: '0.0.0.0',  // Accessible on LAN for testing
    proxy: {
      // Only REST API calls need proxying (no WebSocket anymore)
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});

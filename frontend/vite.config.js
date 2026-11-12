import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from the repo root .env (shared with the backend) and process.env.
  const env = {
    ...loadEnv(mode, path.resolve(__dirname, '..'), ''),
    ...loadEnv(mode, __dirname, ''),
  };
  const apiProxyTarget = env.API_PROXY_TARGET || `http://localhost:${env.PORT || 4000}`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: false },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.js'],
      css: false,
    },
  };
});

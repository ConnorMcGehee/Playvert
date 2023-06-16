import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    server: {
      proxy: isDev ? {
        '/auth': 'http://localhost:8888',
        '/api': 'http://localhost:8888',
      } : undefined,
    },
  };
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from "dotenv";

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = process.env.ENVIRONMENT === "dev";

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
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from "dotenv";

dotenv.config();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = process.env.ENVIRONMENT === "dev";

  return {
    plugins: [react(),
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Referrer-Policy", "origin");
          next();
        });
      },
    }],
    server: {
      proxy: isDev ? {
        '/auth': 'http://localhost:8888',
        '/api': 'http://localhost:8888',
      } : undefined,
    },
  };
});
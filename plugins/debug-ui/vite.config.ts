import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.AI_API_KEY;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'https://ai.gustafson75.site',
          changeOrigin: true,
          ...(apiKey && {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }),
        },
      },
    },
  };
});
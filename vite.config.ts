import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
    },
    define: {
      'process.env.EXPO_PUBLIC_FINNHUB_API_KEY': JSON.stringify(
        env.EXPO_PUBLIC_FINNHUB_API_KEY || env.VITE_FINNHUB_API_KEY || '',
      ),
      'process.env.VITE_FINNHUB_API_KEY': JSON.stringify(env.VITE_FINNHUB_API_KEY || ''),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});

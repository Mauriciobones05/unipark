import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import mockPlugin from './mock/mockPlugin.js';

// "npm run dev"     -> painel + SIMULADOR do ESP32 (nao precisa de hardware)
// "npm run dev:esp" -> painel + /api encaminhada para o ESP32 real (PC no Wi-Fi Cancela-ESP32)
// "npm run build"   -> gera ../data (LittleFS). O simulador nunca entra no build.
export default defineConfig(({ mode }) => {
  const useEsp = mode === 'esp';
  return {
    plugins: [react(), tailwindcss(), ...(useEsp ? [] : [mockPlugin()])],
    base: '/',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      outDir: '../data',
      emptyOutDir: true,
      rollupOptions: {
        output: { entryFileNames: 'app.js', assetFileNames: '[name][extname]' },
      },
    },
    server: { proxy: useEsp ? { '/api': 'http://192.168.4.1' } : {} },
  };
});

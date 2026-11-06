import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O build vai direto para ../data (pasta do LittleFS). Nomes SEM hash para o ESP32 servir sempre os mesmos caminhos.
// Em desenvolvimento (npm run dev), as chamadas /api sao encaminhadas para o ESP32 (ajuste o IP se precisar).
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../data',
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'app.js', assetFileNames: '[name][extname]' },
    },
  },
  server: { proxy: { '/api': 'http://192.168.4.1' } },
});

// Plugin do Vite: responde /api/* com o simulador (npm run dev). Nao entra no build para o ESP32.
import { createSimulator } from './simulator.js';

export default function mockPlugin() {
  return {
    name: 'cancela-mock-esp32',
    apply: 'serve',
    configureServer(server) {
      const sim = createSimulator();
      server.middlewares.use('/api', (req, res) => {
        const url = new URL(req.url, 'http://x');
        const path = url.pathname.replace(/^\//, '');
        let raw = '';
        req.on('data', c => { raw += c; });
        req.on('end', () => {
          const args = Object.fromEntries(new URLSearchParams(raw));
          for (const [k, v] of url.searchParams) args[k] = v;
          const r = sim(req.method, path, args);
          res.statusCode = r.http;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(r.body));
        });
      });
      console.log('\n  [mock] Simulador do ESP32 ativo: o painel funciona sem hardware.\n');
    },
  };
}

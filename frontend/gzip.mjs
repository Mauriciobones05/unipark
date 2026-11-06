// Pos-build: comprime app.js e index.css (gzip) e remove os originais. O ESP32 envia o .gz com Content-Encoding: gzip.
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
for (const f of ['app.js', 'index.css']) {
  const p = new URL('../data/' + f, import.meta.url);
  writeFileSync(new URL('../data/' + f + '.gz', import.meta.url), gzipSync(readFileSync(p), { level: 9 }));
  rmSync(p);
}

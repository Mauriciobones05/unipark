// Teste rapido do simulador via HTTP:  node mock/smoke.mjs [porta]   (com "npm run dev" rodando)
const base = `http://localhost:${process.argv[2] || 5173}/api/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => (await fetch(base + p)).json();
const post = async p => { const r = await fetch(base + p, { method: 'POST' }); return `${r.status} ${(await r.json()).message}`; };
let fails = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'OK   ' : 'FALHA'), name, extra); if (!ok) fails++; };

let s = await get('status');
check('inicia FECHADA com 5 vagas livres', s.state === 'FECHADA' && s.parking.free === 5);

await post('sim/car'); await sleep(300);
s = await get('status');
check('carro na chegada abre (ABRINDO/ABERTA) com autorizacao de ENTRADA', ['ABRINDO', 'ABERTA'].includes(s.state) && s.parking.auth === 'ENTRADA', s.state);
check('vaga so conta na passagem', s.parking.occupied === 0);

await sleep(1500); await post('sim/pass'); await sleep(2000);
s = await get('status');
check('passagem conta 1 vaga', s.parking.occupied === 1 && s.parking.entries === 1, `ocupadas=${s.parking.occupied}`);

console.log('...aguardando fechamento automatico (~13 s)');
await sleep(13000);
s = await get('status');
check('fecha sozinha apos passagem livre', s.state === 'FECHADA', s.state);

console.log('liberar saida:', await post('release-exit')); await sleep(2500); await post('sim/pass'); await sleep(2000);
s = await get('status');
check('saida libera 1 vaga', s.parking.occupied === 0 && s.parking.exits === 1);

check('liberar saida vazio = 409', (await post('release-exit')).startsWith('409'));
check('ocupacao acima da capacidade = 400', (await post('parking/occupied?value=9')).startsWith('400'));
await sleep(6000);                       // espera a cancela fechar sozinha
await post('parking/occupied?value=5');
check('liberar entrada lotado = 409', (await post('release-entry')).startsWith('409'));
await post('sim/car'); await sleep(500);
s = await get('status');
check('carro com estacionamento lotado e barrado', s.state === 'FECHADA' && s.parking.deniedFull === 1, s.state);

await post('parking/occupied?value=2'); await sleep(1700);
console.log('liberar entrada:', await post('release-entry')); await sleep(1500);
s = await get('status');
check('operador libera entrada: ABERTA', s.state === 'ABERTA', s.state);
await post('sim/obstacle?on=1'); await sleep(100);
check('obstaculo bloqueia fechar = 409', (await post('close')).startsWith('409'));
await post('sim/obstacle?on=0');
console.log(fails ? `\n${fails} falha(s)` : '\nTodos os testes do simulador passaram');
process.exit(fails ? 1 : 0);

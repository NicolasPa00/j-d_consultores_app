// Estados activos, «Más» marcado en un módulo de la hoja, Escape y foco.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [,, SES, OUT] = process.argv;
const s = JSON.parse(fs.readFileSync(SES, 'utf8'));
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000 });
const p = await b.newPage();
await p.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto('http://localhost:4001/login', { waitUntil: 'networkidle2' }); await espera(800);
await p.evaluate((t, u) => { localStorage.setItem('sst_token', t); localStorage.setItem('sst_usuario', JSON.stringify(u)); localStorage.setItem('orbita_sistema', 'operacion'); }, s.token, s.usuario);
const barra = () => p.evaluate(() => [...document.querySelectorAll('.bottom-nav__item')].map(e => {
  const t = e.querySelector('.bottom-nav__texto');
  return (e.classList.contains('bottom-nav__item--activo') ? '*' : '') + t.textContent.trim() + (t.scrollWidth > t.clientWidth ? '(CORTADO)' : '');
}).join(' | '));
for (const ruta of ['/profesionales', '/empresas', '/configuracion', '/facturacion', '/terceros']) {
  await p.goto('http://localhost:4001' + ruta, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await espera(1200);
  console.log(ruta, '→', await barra());
  await p.screenshot({ path: path.join(OUT, `despues-activo${ruta.replace('/', '-')}-360.png`) });
}
// Escape y foco
await p.click('.bottom-nav__item--mas'); await espera(400);
const dentro = await p.evaluate(() => document.activeElement?.closest('.hoja-mas') ? document.activeElement.textContent.trim() : 'FUERA');
await p.keyboard.press('Escape'); await espera(300);
const tras = await p.evaluate(() => ({ abierta: !!document.querySelector('.hoja-mas'), foco: document.activeElement?.className }));
console.log('foco al abrir:', dentro, '· tras Escape:', JSON.stringify(tras));
await b.close();

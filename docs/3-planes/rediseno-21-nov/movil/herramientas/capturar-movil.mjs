// Capturas de la barra inferior del celular: dos sistemas × perfiles × anchos, con la hoja «Más».
// Uso: node capturar-movil.mjs <sesion.json> <carpeta-salida> <prefijo>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [,, SES, OUT, PRE] = process.argv;
const s = JSON.parse(fs.readFileSync(SES, 'utf8'));
const TODAS = ['dashboard','importar','ordenes','profesionales','precuentas','empresas','informes','configuracion','facturacion','documentos_soporte','nomina','terceros','parametrizacion','contabilidad','cartera','compras','informes_contables'];
const PERFILES = {
  admin: TODAS,
  // Administrativo de oficina: programa órdenes y cobra, sin importar ni profesionales.
  administrativo: ['dashboard','ordenes','precuentas','empresas','configuracion'],
  // Contadora sin Inicio, sin nómina ni pago a profesionales.
  contador: ['facturacion','cartera','compras','contabilidad','informes_contables','terceros','parametrizacion','configuracion'],
};
const CASOS = [
  ['operacion','admin'], ['operacion','administrativo'], ['finanzas','admin'], ['finanzas','contador'],
];
const ANCHOS = [[390,844],[360,740]];
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000 });
for (const [sis, perfil] of CASOS.filter(c => !process.env.SOLO || c[0] === process.env.SOLO)) for (const [w,h] of ANCHOS) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const permisos = PERFILES[perfil];
  const usuario = perfil === 'admin' ? s.usuario : { ...s.usuario, es_maestro: false, rol: perfil };
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    if (r.url().endsWith('/api/auth/me') && r.method() === 'GET') {
      return r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ usuario, permisos }) });
    }
    r.continue();
  });
  await p.goto('http://localhost:4001/login', { waitUntil: 'networkidle2' }); await espera(800);
  await p.evaluate((t, u, pe, sis) => {
    localStorage.setItem('sst_token', t);
    localStorage.setItem('sst_usuario', JSON.stringify(u));
    localStorage.setItem('sst_permisos', JSON.stringify(pe));
    localStorage.setItem('orbita_sistema', sis);
    localStorage.setItem('orbita_sistema_recordado', sis);
  }, s.token, usuario, permisos, sis);
  const inicio = permisos.includes('dashboard') ? '/dashboard' : '/facturacion';
  await p.goto('http://localhost:4001' + inicio, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await espera(1500);
  const base = `${PRE}-${sis}-${perfil}-${w}`;
  await p.screenshot({ path: path.join(OUT, `${base}-inicio.png`) });
  // Medidas: rótulos de la barra y su ancho real.
  const info = await p.evaluate(() => [...document.querySelectorAll('.bottom-nav__item')].map(e => {
    const t = e.querySelector('.bottom-nav__texto'); return `${t?.textContent?.trim()}:${Math.round(t?.scrollWidth)}/${Math.round(e.clientWidth)}`; }));
  const mas = await p.$('.bottom-nav button.bottom-nav__item');
  if (mas) { await mas.click(); await espera(500); }
  const hoja = await p.evaluate(() => { const e = document.querySelector('.hoja-mas'); return e ? `${Math.round(e.getBoundingClientRect().height)}px scroll=${e.scrollHeight > e.clientHeight}` : 'sin hoja'; });
  await p.screenshot({ path: path.join(OUT, `${base}-mas.png`) });
  console.log(base, info.join(' | '), '· hoja', hoja);
  await p.close();
}
await b.close();

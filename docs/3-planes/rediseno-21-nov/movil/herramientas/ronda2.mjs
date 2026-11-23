// Ronda 2 de la barra del celular: capturas + comprobaciones de los defectos del juez.
// Uso (desde herramientas/ayuda-capturas, donde está puppeteer-core):
//   node ronda2.mjs <sesion.json> <carpeta> [base=http://localhost:4003]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [,, SES, OUT, BASE = 'http://localhost:4003'] = process.argv;
const s = JSON.parse(fs.readFileSync(SES, 'utf8'));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const TODAS = ['dashboard','importar','ordenes','profesionales','precuentas','empresas','informes','configuracion','facturacion','documentos_soporte','nomina','terceros','parametrizacion','contabilidad','cartera','compras','informes_contables'];
const PERFILES = {
  admin: TODAS,
  // Administrativo como el de producción según el juez: Inicio, Cuentas de cobro, Estadísticas, Configuración.
  administrativo: ['dashboard','precuentas','informes','configuracion'],
  coordinadora: ['dashboard','importar','ordenes','profesionales','precuentas','empresas','informes','configuracion'],
  // Contadora sin Inicio: debe ver la barra de producción (Facturación · Cartera · Contabilidad · Informes).
  contador: ['facturacion','cartera','compras','contabilidad','informes_contables','terceros','parametrizacion','configuracion','documentos_soporte','nomina'],
};
// --disable-web-security: el backend solo responde CORS a :4001; este ng serve va en otro puerto.
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000,
  args: ['--disable-web-security', '--user-data-dir=' + path.join(OUT, '..', '_perfil-chrome')],
});
const log = [];
const anota = (...a) => { const t = a.join(' '); log.push(t); console.log(t); };

async function abrir(perfil, sis, w, h) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const permisos = PERFILES[perfil];
  const usuario = perfil === 'admin' ? s.usuario : { ...s.usuario, es_maestro: false, rol: perfil === 'coordinadora' ? 'administrativo' : perfil };
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    if (r.url().endsWith('/api/auth/me') && r.method() === 'GET') {
      return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ usuario, permisos }) });
    }
    r.continue();
  });
  await p.goto(BASE + '/login', { waitUntil: 'networkidle2' }); await espera(600);
  await p.evaluate((t, u, pe, sis) => {
    localStorage.setItem('sst_token', t); localStorage.setItem('sst_usuario', JSON.stringify(u));
    localStorage.setItem('sst_permisos', JSON.stringify(pe)); localStorage.setItem('orbita_sistema', sis);
    localStorage.setItem('orbita_sistema_recordado', sis);
  }, s.token, usuario, permisos, sis);
  const inicio = permisos.includes('dashboard') ? '/dashboard' : '/facturacion';
  await p.goto(BASE + inicio, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  await espera(1200);
  return p;
}
const barra = (p) => p.evaluate(() => [...document.querySelectorAll('.bottom-nav__item')].map((e) => {
  const t = e.querySelector('.bottom-nav__texto'); const r = e.getBoundingClientRect();
  return (e.classList.contains('bottom-nav__item--activo') ? '*' : '') + t.textContent.trim()
    + (t.scrollWidth > t.clientWidth ? '(CORTADO)' : '') + `@${Math.round(r.left)}-${Math.round(r.right)}`;
}).join(' | '));

// 1) Capturas por perfil y ancho
const CASOS = [['operacion','admin'],['operacion','administrativo'],['operacion','coordinadora'],['finanzas','admin'],['finanzas','contador']];
for (const [sis, perfil] of CASOS) for (const [w, h] of [[390, 844], [360, 740]]) {
  const p = await abrir(perfil, sis, w, h);
  const base = `r2-${sis}-${perfil}-${w}`;
  await p.screenshot({ path: path.join(OUT, `${base}-inicio.png`) });
  anota(base, '·', await barra(p));
  await p.click('.bottom-nav__item--mas'); await espera(450);
  const hoja = await p.evaluate(() => { const e = document.querySelector('.hoja-mas'); const r = e.getBoundingClientRect();
    return `hoja ${Math.round(r.top)}-${Math.round(r.bottom)} (${Math.round(r.height)} px) scroll=${e.scrollHeight > e.clientHeight}`; });
  await p.screenshot({ path: path.join(OUT, `${base}-mas.png`) });
  // F1: lo que hay bajo el centro de «Más» con la hoja abierta
  const bajoMas = await p.evaluate(() => { const r = document.querySelector('.bottom-nav__item--mas').getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button, a')?.className ?? 'nada'; });
  anota('   ', hoja, '· bajo «Más»:', bajoMas);
  await p.close();
}

// 2) Comportamiento (admin, Finanzas, 360×740)
const p = await abrir('admin', 'finanzas', 360, 740);
const estado = () => p.evaluate(() => ({ abierta: !!document.querySelector('.hoja-mas'), url: location.pathname, largo: history.length,
  foco: document.activeElement === document.body ? 'body' : (document.activeElement?.className || document.activeElement?.tagName) }));
// F1: tocar «Más» dos veces
await p.tap('.bottom-nav__item--mas'); await espera(400);
await p.tap('.bottom-nav__item--mas'); await espera(400);
anota('F1 doble toque en «Más» →', JSON.stringify(await estado()));
// F4: trampa de foco (12 Tab y 3 Shift+Tab)
await p.click('.bottom-nav__item--mas'); await espera(400);
const fuera = [];
for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); fuera.push(await p.evaluate(() => !!document.activeElement.closest('.hoja-mas'))); }
await p.keyboard.down('Shift'); for (let i = 0; i < 3; i++) { await p.keyboard.press('Tab'); fuera.push(await p.evaluate(() => !!document.activeElement.closest('.hoja-mas'))); } await p.keyboard.up('Shift');
const inert = await p.evaluate(() => document.querySelector('.main').hasAttribute('inert'));
anota('F4 foco dentro de la hoja en los 17 Tab:', fuera.every(Boolean), '· .main inert:', inert);
// F5: Atrás cierra la hoja sin cambiar de pantalla
const antes = await estado();
await p.goBack().catch(() => {}); await espera(600);
anota('F5 Atrás con la hoja abierta → antes', JSON.stringify(antes), '· después', JSON.stringify(await estado()));
// F6: ✕
await p.click('.bottom-nav__item--mas'); await espera(400);
await p.click('.hoja-mas__cerrar'); await espera(400);
anota('F6 ✕ →', JSON.stringify(await estado()));
// F7: navegar desde la hoja (Terceros) → foco en el contenido, sin entrada extra en el historial
const largo0 = await p.evaluate(() => history.length);
await p.click('.bottom-nav__item--mas'); await espera(400);
await Promise.all([p.waitForNavigation({ timeout: 5000 }).catch(() => {}), p.evaluate(() => [...document.querySelectorAll('.hoja-mas__item')].find((a) => a.textContent.includes('Terceros')).click())]);
await espera(1200);
const e7 = await estado();
anota('F7 desde la hoja a Terceros →', JSON.stringify(e7), '· historial', largo0, '→', e7.largo);
await p.goBack().catch(() => {}); await espera(1000);
anota('    Atrás desde Terceros →', JSON.stringify(await estado()));
// Cerrar sesión pide confirmación
await p.click('.bottom-nav__item--mas'); await espera(400);
await p.click('.hoja-mas__accion--salir'); await espera(500);
const conf = await p.evaluate(() => ({ dialogo: document.body.innerText.includes('¿Desea cerrar la sesión'), token: !!localStorage.getItem('sst_token') }));
await p.screenshot({ path: path.join(OUT, 'r2-confirmar-salir-360.png') });
anota('Cerrar sesión → confirmación visible:', conf.dialogo, '· sigue la sesión:', conf.token);
await p.keyboard.press('Escape'); await espera(300);
// F8: abrir a 360 y ensanchar a 900, volver a 360
await p.click('.bottom-nav__item--mas').catch(() => {}); await espera(400);
await p.setViewport({ width: 900, height: 740, deviceScaleFactor: 1 }); await espera(400);
await p.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await espera(500);
anota('F8 360 → 900 → 360 →', JSON.stringify(await estado()));
await p.close();

// F9: 320 px con Profesionales activo
const q = await abrir('admin', 'operacion', 320, 640);
await q.goto(BASE + '/profesionales', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}); await espera(1200);
anota('F9 320 px en /profesionales ·', await barra(q));
await q.screenshot({ path: path.join(OUT, 'r2-operacion-admin-320-profesionales.png') });
await q.close();

await b.close();
fs.writeFileSync(path.join(OUT, 'r2-mediciones.txt'), log.join('\n') + '\n');

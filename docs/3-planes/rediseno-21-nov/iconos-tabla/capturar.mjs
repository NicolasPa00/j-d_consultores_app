// Captura la lámina a 1x y 2x: página completa y recortes por sección.
// Uso: node capturar.mjs <carpeta-salida>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const req = createRequire('C:/Program Files/nodejs/node_modules/@playwright/cli/node_modules/playwright-core/package.json');
const { chromium } = req('playwright-core');
const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const SALIDA = path.resolve(process.argv[2]);
fs.mkdirSync(SALIDA, { recursive: true });
const url = 'file:///' + path.join(AQUI, 'lamina.html').replace(/\\/g, '/');
const browser = await chromium.launch({ channel: 'chrome' });
for (const dsf of [1, 1.25, 1.5, 2]) {
  const escala = dsf === 1 || dsf === 2;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  if (escala) await page.screenshot({ path: path.join(SALIDA, `lamina@${dsf}x.png`), fullPage: true });
  for (const sel of (escala ? ['#cab', '#adn', '#contraste', '#maximo', '#angosta', '#catalogo', '#tactil', '#v-ordenes', '#v-facturacion', '#v-ds', '#v-cuentas', '#v-nomina', '#v-cartera', '#v-terceros', '#v-profesionales', '#v-configuracion', '#v-contabilidad'] : ['#adn', '#maximo', '#v-facturacion', '#v-ordenes'])) {
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: path.join(SALIDA, `${sel.slice(1)}@${dsf}x.png`) });
  }
  await ctx.close();
}
await browser.close();
console.log('capturas en', SALIDA);

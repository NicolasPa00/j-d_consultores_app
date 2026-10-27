// Revisión visual del Centro de ayuda: fotografía cada figura TAL COMO SE VE en /ayuda (imagen + recuadros numerados),
// en escritorio (1440 px) y en móvil (390 px), para comprobar a ojo que cada número cae sobre su botón.
//   node herramientas/ayuda-capturas/revisar.mjs <carpeta-de-salida> <tema> [<tema>…]
// Sale <carpeta>/<tema>-<n>-escritorio.png y <tema>-<n>-movil.png. Usa la misma sesion.json que ayuda-capturas.mjs.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const sesion = JSON.parse(fs.readFileSync(path.join(DIR, 'sesion.json'), 'utf8'));
const URL_BASE = process.env.ORBITA_URL ?? 'http://localhost:4001';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [salida, ...temas] = process.argv.slice(2);
if (!salida || !temas.length) { console.log('Uso: node revisar.mjs <carpeta-de-salida> <tema> [<tema>…]'); process.exit(1); }
fs.mkdirSync(salida, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  for (const [nombre, ancho, alto] of [['escritorio', 1440, 900], ['movil', 390, 844]]) {
    const p = await browser.newPage();
    await p.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1 });
    await p.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle2' });
    await p.evaluate((s) => {
      localStorage.setItem('sst_token', s.token);
      localStorage.setItem('sst_usuario', JSON.stringify(s.usuario));
      localStorage.setItem('sst_permisos', JSON.stringify(s.permisos));
    }, sesion);
    for (const tema of temas) {
      await p.goto(`${URL_BASE}/ayuda?tema=${tema}`, { waitUntil: 'networkidle2' });
      await new Promise((r) => setTimeout(r, 1500));
      const figuras = await p.$$('figure.ayu-figura');
      if (!figuras.length) console.log(`✗ ${tema}: sin figuras en /ayuda`);
      for (const [i, f] of figuras.entries()) {
        await f.scrollIntoView();
        await new Promise((r) => setTimeout(r, 400));
        await f.screenshot({ path: path.join(salida, `${tema}-${i + 1}-${nombre}.png`) });
      }
      // Desborde horizontal en móvil: la página no debe moverse de lado.
      if (nombre === 'movil') {
        const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (desborde > 1) console.log(`✗ ${tema}: la página se desborda ${desborde} px en móvil`);
      }
      console.log(`✓ ${tema} (${nombre}): ${figuras.length} figura(s)`);
    }
    await p.close();
  }
} finally {
  await browser.close();
}

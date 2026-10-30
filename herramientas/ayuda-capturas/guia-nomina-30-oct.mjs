// 30-oct-2026 · Capturas de la guía «Nómina: días, auxilio, salud y pensión» (entregas-cliente/2026-10-30-…).
//   node herramientas/ayuda-capturas/guia-nomina-30-oct.mjs <carpetaDeSalida>
// Antes: sst_ws/scripts/guia-nomina-30-oct-datos.mjs (empleados inventados + sesión renovada), :4000 y :4001 en marcha.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.resolve(process.argv[2] ?? '.');
fs.mkdirSync(SALIDA, { recursive: true });
const sesion = JSON.parse(fs.readFileSync(path.join(DIR, 'sesion.json'), 'utf8'));
const URL_BASE = process.env.ORBITA_URL ?? 'http://localhost:4001';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1.5 });
  p.on('pageerror', (e) => console.log('  ERROR de página:', String(e).slice(0, 200)));
  await p.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle2' });
  await p.evaluate((s) => {
    localStorage.setItem('sst_token', s.token);
    localStorage.setItem('sst_usuario', JSON.stringify(s.usuario));
    localStorage.setItem('sst_permisos', JSON.stringify(s.permisos));
    localStorage.setItem('orbita_sistema', 'finanzas');
  }, sesion);

  const abrir = async (empleado) => {
    await p.goto(`${URL_BASE}/nomina`, { waitUntil: 'networkidle2' });
    // Hasta que Angular hidrata, el clic no hace nada: se repite hasta que abre el modal.
    for (let i = 0; i < 20 && !(await p.$('#nomLiqEmp')); i++) {
      await espera(500);
      await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Liquidar nómina')?.click());
    }
    await p.waitForSelector('#nomLiqEmp');
    await p.click('#nomLiqEmp');
    await p.type('#nomLiqEmp', empleado);
    await espera(300);
    await p.evaluate(() => document.querySelector('.sb__opcion:not(.sb__opcion--vacio)').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    // La vista previa se pide al servidor; la foto solo sirve con la liquidación ya a la derecha.
    await p.waitForSelector('.nom-desp', { timeout: 20000 });
    await espera(500);
  };
  const escribir = async (sel, valor) => { await p.click(sel, { clickCount: 3 }); await p.type(sel, valor); };
  /** Foto del modal entero, con la sección nueva arriba a la vista. */
  const foto = async (nombre) => {
    await p.evaluate(() => {
      const sec = document.querySelector('#nomLiqDias').closest('section');
      sec.style.outline = '3px solid #1fb6c9'; sec.style.outlineOffset = '6px'; sec.style.borderRadius = '6px';
    });
    await espera(300);
    const modal = await p.$('.modal');
    await modal.screenshot({ path: path.join(SALIDA, nombre) });
    console.log('✓', nombre);
  };

  // 1 · Mes completo, todo automático: el auxilio y la salud/pensión salen solos.
  await abrir('CAROLINA');
  await foto('1-automatico-mes-completo.png');

  // 2 · Empleada que entra el 19: 12 días solos.
  await abrir('VALENTINA');
  await foto('2-ingreso-el-19.png');

  // 3 · Escrito a mano: días, auxilio con valor, salud y pensión.
  await abrir('CAROLINA');
  await escribir('#nomLiqDias', '15');
  await p.select('#nomLiqAux', 'si');
  await p.waitForSelector('#nomLiqAuxValor');
  await escribir('#nomLiqAuxValor', '124547');
  await escribir('#nomLiqSalud', '44000');
  await escribir('#nomLiqPension', '44000');
  await espera(1800);
  await foto('3-escrito-a-mano.png');
} finally {
  await browser.close();
}

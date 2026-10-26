// Pantallazos del Centro de ayuda con CAJAS MEDIDAS (no a ojo).
//   node herramientas/ayuda-capturas/ayuda-capturas.mjs <tema>        (p. ej. importar-ordenes)
// Por cada figura: navega/prepara la pantalla, mide con getBoundingClientRect cada elemento a marcar y
// guarda   public/ayuda/<tema>/<n>.webp   +   src/app/pages/ayuda/ilustraciones/<tema>.ts
// (las cajas van en % de la imagen, así la marca queda sobre su botón a cualquier tamaño).
// Usa SOLO datos inventados contra una base de desarrollo (jdd_dev). Guía completa: docs/3-planes/plan-centro-de-ayuda.md
//
// Variables de entorno (todas opcionales):
//   ORBITA_URL      frontend en marcha            (por defecto http://localhost:4001)
//   CHROME_PATH     ejecutable de Chrome/Edge     (por defecto el Chrome de Windows)
//   AYUDA_EXCEL     Excel demo de ARL SURA        (por defecto ../2-pruebas/ordenes/sura/demo-sura-estado-tareas.xlsx,
//                                                  el que escribe sst_ws/scripts/generar-orden-sura-demo.mjs)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(DIR, '..', '..');
const SESION = path.join(DIR, 'sesion.json');
if (!fs.existsSync(SESION)) {
  console.log(`Falta ${SESION} (lleva un token, no se versiona). Ver «Preparar» en docs/3-planes/plan-centro-de-ayuda.md`);
  process.exit(1);
}
const sesion = JSON.parse(fs.readFileSync(SESION, 'utf8'));
const tema = process.argv[2];
const VW = 1440, VH = 810;
// Fuera de public/: si se escribe ahí mientras se captura, ng serve recarga la página y se pierde el estado.
const TMP = path.join(os.tmpdir(), 'orbita-ayuda-tmp');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_BASE = process.env.ORBITA_URL ?? 'http://localhost:4001';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EXCEL_ORIGEN = process.env.AYUDA_EXCEL ?? path.resolve(FRONT, '..', '2-pruebas', 'ordenes', 'sura', 'demo-sura-estado-tareas.xlsx');

/**
 * Receta por tema: devuelve la lista de figuras { titulo, texto, marcas:[{css, texto, etiqueta, pad?, nth?}], completa?, margen? }
 * y llama foto(p, tema, n, figura) cuando la pantalla está lista. Ver la sección «Cómo escribir una receta» del plan.
 */
const RECETAS = {
  'importar-ordenes': async (p, ctx) => {
    const figs = [];
    await p.goto(`${URL_BASE}/importar`, { waitUntil: 'networkidle2' });
    await espera(1500);
    await (await p.$('input[type=file]')).uploadFile(ctx.excel());
    await espera(2500);
    figs.push({
      titulo: 'Suba el archivo',
      texto: 'Arrastre el Excel o el PDF a la zona punteada, o pulse para elegirlo. Puede sumar varios archivos a la misma tanda.',
      marcas: [
        { css: 'div, label, button', texto: 'Añadir más archivos', etiqueta: 'Zona para soltar archivos' },
        { css: 'span, div, li', texto: 'demo-sura-estado-tareas.xlsx', etiqueta: 'Archivo elegido' },
        { css: 'button', texto: 'Procesar con IA', etiqueta: 'Leer el archivo' },
      ],
    });
    await foto(p, tema, 1, figs[0]);
    await clic(p, 'Procesar con IA');
    await espera(7000);
    await p.evaluate(() => {
      for (const sel of document.querySelectorAll('select')) {
        if (sel.value === '' || /Elegir/.test(sel.options[sel.selectedIndex]?.text ?? '')) {
          const op = [...sel.options].find((o) => /Capacitaci/i.test(o.text));
          if (op) { sel.value = op.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      }
    });
    await espera(1200);
    figs.push({
      titulo: 'Revise la vista previa',
      texto: 'ORBITA reconoce la ARL, lee cada fila y muestra qué tan segura está. Elija el tipo de orden (de él sale el valor de la hora) y revise las horas.',
      marcas: [
        { css: 'th', texto: 'ARL detectada', etiqueta: 'ARL reconocida' },
        { css: 'th', texto: 'Tipo de orden', etiqueta: 'Tipo de orden' },
        { css: 'th', texto: 'Confianza', etiqueta: 'Qué tan segura está' },
        { css: 'th', texto: 'Revisar', etiqueta: 'Comparar con el original' },
      ],
    });
    await foto(p, tema, 2, figs[1]);
    return figs;
  },
};

/** Pulsa el primer botón o enlace habilitado cuyo texto empieza por `texto`. */
async function clic(p, texto) {
  await p.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a')].find((e) => e.textContent.trim().startsWith(t) && !e.disabled);
    el?.click();
  }, texto);
  await espera(1200);
}

/** Mide cada marca (rect del elemento MÁS PEQUEÑO que contenga el texto) y guarda la figura. */
async function foto(p, tema, n, fig) {
  const cajas = await p.evaluate((marcas) => marcas.map((m) => {
    const cand = [...document.querySelectorAll(m.css)].filter((e) => (m.texto ? e.textContent.trim().includes(m.texto) : true) && e.getBoundingClientRect().width > 0);
    cand.sort((a, b) => a.textContent.length - b.textContent.length);
    const el = cand[m.nth ?? 0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  }), fig.marcas);
  const out = path.join(TMP, tema);
  fs.mkdirSync(out, { recursive: true });
  // Recorte automático: la unión de las marcas con aire alrededor (si no, el texto sale diminuto).
  const ok = cajas.filter(Boolean);
  let clip = { x: 0, y: 0, width: VW, height: VH };
  if (!fig.completa && ok.length) {
    const x0 = Math.min(...ok.map((c) => c[0])), y0 = Math.min(...ok.map((c) => c[1]));
    const x1 = Math.max(...ok.map((c) => c[0] + c[2])), y1 = Math.max(...ok.map((c) => c[1] + c[3]));
    const M = fig.margen ?? 70;
    let w = Math.max(820, x1 - x0 + 2 * M), h = Math.max(480, y1 - y0 + 2 * M);
    w = Math.min(w, VW); h = Math.min(h, VH);
    const x = Math.min(Math.max(0, (x0 + x1) / 2 - w / 2), VW - w), y = Math.min(Math.max(0, (y0 + y1) / 2 - h / 2), VH - h);
    clip = { x, y, width: w, height: h };
  }
  await p.screenshot({ path: path.join(out, `${n}.webp`), type: 'webp', quality: 88, clip });
  fig.img = `ayuda/${tema}/${n}.webp`;
  fig.marcas = fig.marcas.map((m, i) => {
    if (!cajas[i]) { console.log(`  ✗ no encontré «${m.etiqueta}» (${m.css} · ${m.texto})`); return null; }
    const pad = m.pad ?? 5;
    const [x, y, w, h] = cajas[i];
    const f = (v, tot) => Math.round((v / tot) * 10000) / 100;
    return { n: i + 1, etiqueta: m.etiqueta, caja: [f(Math.max(clip.x, x - pad) - clip.x, clip.width), f(Math.max(clip.y, y - pad) - clip.y, clip.height), f(w + 2 * pad, clip.width), f(h + 2 * pad, clip.height)] };
  }).filter(Boolean).map((m, i) => ({ ...m, n: i + 1 }));
  console.log('✓', tema, n, fig.marcas.map((m) => m.etiqueta).join(' | '));
}

/** Chrome headless no sube archivos desde algunas carpetas (Escritorio/OneDrive): se copia el Excel a la carpeta temporal. */
function excelDemo() {
  if (!fs.existsSync(EXCEL_ORIGEN)) {
    console.log(`Falta el Excel demo (${EXCEL_ORIGEN}). Generarlo: cd sst_ws && node scripts/generar-orden-sura-demo.mjs`);
    process.exit(1);
  }
  const destino = path.join(os.tmpdir(), 'orbita-video', path.basename(EXCEL_ORIGEN));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(EXCEL_ORIGEN, destino);
  return destino;
}

if (!RECETAS[tema]) { console.log('Temas con receta:', Object.keys(RECETAS).join(', ')); process.exit(1); }
fs.rmSync(path.join(TMP, tema), { recursive: true, force: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const p = await browser.newPage();
await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1.5 });
p.on('pageerror', (e) => console.log('  ERROR de página:', String(e).slice(0, 200)));
await p.goto(`${URL_BASE}/login`, { waitUntil: 'networkidle2' });
await p.evaluate((s) => {
  localStorage.setItem('sst_token', s.token);
  localStorage.setItem('sst_usuario', JSON.stringify(s.usuario));
  localStorage.setItem('sst_permisos', JSON.stringify(s.permisos));
  localStorage.setItem('orbita_sistema', 'operacion');
}, sesion);
try {
  const figs = await RECETAS[tema](p, { excel: excelDemo });
  const dirTs = path.join(FRONT, 'src', 'app', 'pages', 'ayuda', 'ilustraciones');
  fs.mkdirSync(dirTs, { recursive: true });
  const datos = figs.map(({ titulo, texto, img, marcas }) => ({ titulo, texto, img, marcas }));
  const dirPublic = path.join(FRONT, 'public', 'ayuda', tema);
  fs.rmSync(dirPublic, { recursive: true, force: true });
  fs.cpSync(path.join(TMP, tema), dirPublic, { recursive: true });
  fs.writeFileSync(path.join(dirTs, `${tema}.ts`),
    `// Generado por herramientas/ayuda-capturas/ayuda-capturas.mjs — no editar a mano; se regenera con el script.\nimport type { Ilustracion } from '../ayuda.contenido';\n\nexport const ILUSTRACIONES: Ilustracion[] = ${JSON.stringify(datos, null, 2)};\n`);
} finally {
  await browser.close();
}

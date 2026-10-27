// Pantallazos del Centro de ayuda con CAJAS MEDIDAS (no a ojo).
//   node herramientas/ayuda-capturas/ayuda-capturas.mjs <tema> [<tema>…]     (o «todos»)
// Por cada figura: navega/prepara la pantalla, mide con getBoundingClientRect cada elemento a marcar y
// guarda   public/ayuda/<tema>/<n>.webp   +   src/app/pages/ayuda/ilustraciones/<tema>.ts
// (las cajas van en % de la imagen, así la marca queda sobre su botón a cualquier tamaño).
// Las recetas viven en recetas/*.mjs (una por tema, agrupadas por lote). Guía: docs/3-planes/plan-centro-de-ayuda.md
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
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(DIR, '..', '..');
const SESION = path.join(DIR, 'sesion.json');
if (!fs.existsSync(SESION)) {
  console.log(`Falta ${SESION} (lleva un token, no se versiona). Ver «Preparar» en docs/3-planes/plan-centro-de-ayuda.md`);
  process.exit(1);
}
const sesion = JSON.parse(fs.readFileSync(SESION, 'utf8'));
const VW = 1440, VH = 810;
const MENU = 260; // ancho del menú lateral a 1440 px
// Fuera de public/: si se escribe ahí mientras se captura, ng serve recarga la página y se pierde el estado.
const TMP = path.join(os.tmpdir(), 'orbita-ayuda-tmp');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_BASE = process.env.ORBITA_URL ?? 'http://localhost:4001';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EXCEL_ORIGEN = process.env.AYUDA_EXCEL ?? path.resolve(FRONT, '..', '2-pruebas', 'ordenes', 'sura', 'demo-sura-estado-tareas.xlsx');

/**
 * Datos que pueden ser REALES en la base de desarrollo (órdenes y terceros de pruebas viejas) y no deben salir en
 * una imagen del manual. Se sustituyen SOLO en la página capturada, justo antes de la foto; la base no se toca.
 * Si aparece uno nuevo, se añade aquí. Además, todo correo que no sea de ejemplo se cambia por uno genérico.
 */
const SUSTITUCIONES = [
  ['SERVICIOS PORTUARIOS DEL PACIFICO S A S', 'LOGÍSTICA COSTERA DEMO S.A.S'],
  ['INDUSTRIAS DEL GUAICO S A S', 'INDUSTRIAS EL MOLINO DEMO S.A.S'],
  ['MADERAS Y ACABADOS EL ROBLE LTDA', 'MADERAS EL ROBLE DEMO LTDA'],
  ['TERMINAL DE TRANSPORTES DE IPIALES S A', 'TERMINAL DEMO DEL SUR S.A.'],
  ['IPS SALUD INTEGRAL DEL SUR S A S', 'IPS SALUD DEMO S.A.S'],
  ['AGROPECUARIA EL PORVENIR LTDA', 'AGROPECUARIA DEMO LTDA'],
  ['ALIMENTOS LA COSECHA S A', 'ALIMENTOS DEMO S.A.'],
  ['ELMER SCHNEIDER CASA ANDINA S.A.S', 'CASA ANDINA DEMO S.A.S'],
  ['TRANSPORTE DE SANDONA SA', 'TRANSPORTES DEL SUR DEMO S.A.'],
  ['PRONACON SAS', 'CONSTRUCCIONES DEMO SAS'],
  ['NICOLAS PANTOJA PAEZ', 'ANDRÉS GÓMEZ DEMO'],
  ['ESCALAPP', 'PROVEEDOR DEMO SAS'],
  ['901330742', '900111222'], ['900418877', '900111333'], ['901552340', '900111444'], ['900961204', '900111555'],
  ['901078455', '900111666'], ['900733015', '900111777'], ['900744512', '900111888'], ['891200297', '900111999'],
  ['1193035399', '1000000001'], ['1002224360', '1000000002'],
];

/** Sustituye en el DOM visible (textos y valores de campos) y avisa de correos/números que se cuelen. */
async function sanear(p) {
  return p.evaluate((pares) => {
    const cambia = (t) => {
      let s = t;
      for (const [a, b] of pares) s = s.split(a).join(b);
      // Cualquier correo que no sea de ejemplo pasa a uno genérico: los de la base pueden ser personas reales.
      s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (c) => (/ejemplo|prueba|demo|invalid/i.test(c) ? c : 'contacto@ejemplo.com'));
      // Y los celulares colombianos (10 dígitos que empiezan por 3, con o sin +57 y espacios).
      return s.replace(/(?<!\d)(\+?57\s?)?3\d{2}\s?\d{3}\s?\d{4}(?!\d)/g, '300 000 0000');
    };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const v = cambia(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
    for (const el of document.querySelectorAll('input, textarea')) {
      const v = cambia(el.value); if (v !== el.value) el.value = v;
    }
  }, SUSTITUCIONES);
}

/** Herramientas que reciben las recetas (ver recetas/*.mjs). */
function crearCtx(p, tema) {
  const figs = [];
  const ctx = {
    p, tema, espera, URL_BASE,
    /** Navega a una ruta (sin barra inicial) en el sistema indicado ('operacion' | 'finanzas'). */
    async ir(ruta, sistema = 'operacion') {
      await p.evaluate((s) => localStorage.setItem('orbita_sistema', s), sistema);
      // Recién puesto el token, la app puede estar redirigiendo desde /login y abortar esta navegación: un reintento basta.
      try {
        await p.goto(`${URL_BASE}/${ruta}`, { waitUntil: 'networkidle2' });
      } catch (e) {
        if (!/ERR_ABORTED/.test(e.message)) throw e;
        await espera(1500);
        await p.goto(`${URL_BASE}/${ruta}`, { waitUntil: 'networkidle2' });
      }
      await espera(1500);
    },
    /** Pulsa el primer botón o enlace habilitado cuyo texto EMPIEZA por `texto`. */
    async clic(texto, { css = 'button, a, [role=tab]', esperaMs = 1200 } = {}) {
      const hecho = await p.evaluate((t, sel) => {
        const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().replace(/\s+/g, ' ').toLowerCase().startsWith(t.toLowerCase()) && !e.disabled && e.getBoundingClientRect().width > 0);
        el?.click();
        return !!el;
      }, texto, css);
      if (!hecho) console.log(`  ✗ no encontré el botón «${texto}»`);
      await espera(esperaMs);
      return hecho;
    },
    /** Pulsa el n-ésimo elemento visible que case con el selector (p. ej. '[aria-label="Asignar profesional"]'). */
    async clicSel(sel, nth = 0, esperaMs = 1200) {
      const hecho = await p.evaluate((s, i) => {
        const el = [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0)[i];
        el?.click();
        return !!el;
      }, sel, nth);
      if (!hecho) console.log(`  ✗ no encontré «${sel}» #${nth}`);
      await espera(esperaMs);
      return hecho;
    },
    /** Escribe en el primer campo visible que case con el selector. */
    async escribir(sel, texto) {
      await p.evaluate((s, t) => {
        const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0);
        if (!el) return;
        el.value = t;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, sel, texto);
      await espera(900);
    },
    /** Lleva un elemento (por selector y texto) al centro de la vista, para que la marca quede dentro del recorte. */
    async centrar(css, texto) {
      await p.evaluate((sel, t) => {
        const el = [...document.querySelectorAll(sel)].find((e) => (t ? e.textContent.includes(t) : true) && e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: 'center' });
      }, css, texto);
      await espera(600);
    },
    /** Elige en el n-ésimo <select> visible la opción `indice` (1 = la primera que no es «Elija…»). */
    async elegirOpcion(sel, indice = 1, nth = 0) {
      await p.evaluate((s, i, n) => {
        const el = [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0)[n];
        if (!el || !el.options[i]) return;
        el.value = el.options[i].value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, sel, indice, nth);
      await espera(1800);
    },
    /** Cierra modales con Escape. */
    async escape() { await p.keyboard.press('Escape'); await espera(700); },
    /** Toma la figura n (1, 2…): la guarda y la apunta para el .ts del tema. */
    async foto(fig) { figs.push(fig); await foto(p, tema, figs.length, fig); },
    excel: excelDemo,
    figs,
  };
  return ctx;
}

/** Mide cada marca (rect del elemento MÁS PEQUEÑO que contenga el texto) y guarda la figura. */
async function foto(p, tema, n, fig) {
  await sanear(p);
  await espera(150);
  const cajas = await p.evaluate((marcas) => marcas.map((m) => {
    const cand = [...document.querySelectorAll(m.css)].filter((e) => (m.texto ? e.textContent.trim().replace(/\s+/g, ' ').toLowerCase().includes(m.texto.toLowerCase()) : true) && e.getBoundingClientRect().width > 0);
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
    // A lo ancho, el área de contenido entera (sin el menú lateral de 260 px): recortar por los lados dejaba
    // títulos y columnas cortados. En vertical, la franja de las marcas con aire alrededor.
    const M = fig.margen ?? 70;
    const xi = x0 >= MENU ? MENU : 0;
    const h = Math.min(VH, Math.max(480, y1 - y0 + 2 * M));
    const y = Math.min(Math.max(0, (y0 + y1) / 2 - h / 2), VH - h);
    clip = { x: xi, y, width: VW - xi, height: h };
  }
  await p.screenshot({ path: path.join(out, `${n}.webp`), type: 'webp', quality: 88, clip });
  fig.img = `ayuda/${tema}/${n}.webp`;
  fig.marcas = fig.marcas.map((m, i) => {
    if (!cajas[i]) { console.log(`  ✗ no encontré «${m.etiqueta}» (${m.css} · ${m.texto ?? ''})`); return null; }
    const [x, y, w, h] = cajas[i];
    if (y + h < clip.y || y > clip.y + clip.height || x + w < clip.x || x > clip.x + clip.width) {
      console.log(`  ✗ «${m.etiqueta}» quedó fuera de la imagen (¿falta centrar?)`); return null;
    }
    const pad = m.pad ?? 5;
    const f = (v, tot) => Math.round((v / tot) * 10000) / 100;
    const x0 = Math.max(clip.x, x - pad), y0 = Math.max(clip.y, y - pad);
    const x1 = Math.min(clip.x + clip.width, x + w + pad), y1 = Math.min(clip.y + clip.height, y + h + pad);
    return { n: i + 1, etiqueta: m.etiqueta, caja: [f(x0 - clip.x, clip.width), f(y0 - clip.y, clip.height), f(x1 - x0, clip.width), f(y1 - y0, clip.height)] };
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

// ---- Recetas: cada archivo de recetas/ exporta { '<id del tema>': async (ctx) => { …ctx.foto(fig)… } } ----
const RECETAS = {};
for (const f of fs.readdirSync(path.join(DIR, 'recetas')).filter((f) => f.endsWith('.mjs')).sort()) {
  Object.assign(RECETAS, (await import(pathToFileURL(path.join(DIR, 'recetas', f)).href)).default);
}
let temas = process.argv.slice(2);
if (temas[0] === 'todos') temas = Object.keys(RECETAS);
const faltan = temas.filter((t) => !RECETAS[t]);
if (!temas.length || faltan.length) {
  console.log(`${faltan.length ? `Sin receta: ${faltan.join(', ')}. ` : ''}Temas con receta: ${Object.keys(RECETAS).join(', ')}`);
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  for (const tema of temas) {
    fs.rmSync(path.join(TMP, tema), { recursive: true, force: true });
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
    const ctx = crearCtx(p, tema);
    try {
      await RECETAS[tema](ctx);
    } catch (e) {
      console.log(`✗ ${tema}: ${e.message}`);
      await p.close();
      continue;
    }
    await p.close();
    if (!ctx.figs.length) { console.log(`✗ ${tema}: la receta no tomó ninguna figura`); continue; }
    const dirTs = path.join(FRONT, 'src', 'app', 'pages', 'ayuda', 'ilustraciones');
    fs.mkdirSync(dirTs, { recursive: true });
    const datos = ctx.figs.map(({ titulo, texto, img, marcas }) => ({ titulo, texto, img, marcas }));
    const dirPublic = path.join(FRONT, 'public', 'ayuda', tema);
    fs.rmSync(dirPublic, { recursive: true, force: true });
    fs.cpSync(path.join(TMP, tema), dirPublic, { recursive: true });
    fs.writeFileSync(path.join(dirTs, `${tema}.ts`),
      `// Generado por herramientas/ayuda-capturas/ayuda-capturas.mjs — no editar a mano; se regenera con el script.\nimport type { Ilustracion } from '../ayuda.contenido';\n\nexport const ILUSTRACIONES: Ilustracion[] = ${JSON.stringify(datos, null, 2)};\n`);
  }
} finally {
  await browser.close();
}

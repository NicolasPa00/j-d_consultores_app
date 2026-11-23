// Comprueba el DISCO DEL MÓDULO de las cabeceras de modal (rediseño 21-nov-2026, opción D:
// docs/3-planes/rediseno-21-nov/modales/propuesta.md).
//
//   npm run verificar:iconos-modal            → comprueba (falla con código 1)
//   npm run verificar:iconos-modal -- --tokens → imprime las líneas --ico-modal-* para pegar en _tokens.scss
//
// Por qué: los dibujos del disco son copia de ICONOS de pages/dashboard/dashboard.ts (los accesos del
// Inicio) escrita como data URI en _tokens.scss, y el mapa componente → ícono vive en styles.scss.
// Las dos cosas se desvían en silencio: si el Inicio retoca un ícono, el modal sigue con el viejo;
// y un componente nuevo con modal sale SIN disco (la regla no pinta nada si no está en el mapa).
// Falla si:
//   1. un --ico-modal-<nombre> de _tokens.scss no es exactamente el dibujo de ICONOS.<nombre>;
//   2. el mapa de styles.scss apunta a un token que no existe;
//   3. un componente con `.modal__head` en su HTML (salvo los que solo abren modal--sm / modal--sobre)
//      no está en el mapa.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// --- ICONOS del Inicio (objeto literal de dashboard.ts, se evalúa tal cual) ---
const dash = leer('src/app/pages/dashboard/dashboard.ts');
const ini = dash.indexOf('const ICONOS = {');
const fin = dash.indexOf('} satisfies Record<string, IconoAcceso>;', ini);
if (ini < 0 || fin < 0) { console.error('No encuentro `const ICONOS = {…} satisfies …` en dashboard.ts'); process.exit(1); }
const ICONOS = new Function('return ' + dash.slice(ini + 'const ICONOS = '.length, fin + 1))();

// Mismas capas que el acceso del Inicio: sombra plana (--ico-tinte = cian 58 % sobre blanco = #7dc7e1)
// desplazada 3 unidades, forma y tapa en blanco con trazo acción, trazos en acción y acento en cian-trazo.
// Grosores algo mayores que en el Inicio: aquí el ícono se pinta a 30 px, no a 44.
export function svgIcono(i) {
  const sil = i.forma + (i.tapa ? ' ' + i.tapa : '');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none' stroke-linecap='round' stroke-linejoin='round'>`
    + `<path d='${sil}' fill='#7dc7e1' transform='translate(3 3)'/>`
    + `<path d='${i.forma}' fill='#ffffff' stroke='#13497a' stroke-width='2.4'/>`
    + (i.tapa ? `<path d='${i.tapa}' fill='#ffffff' stroke='#13497a' stroke-width='2.4'/>` : '')
    + (i.trazos ? `<path d='${i.trazos}' stroke='#13497a' stroke-width='2.4'/>` : '')
    + (i.acento ? `<path d='${i.acento}' stroke='#1890bb' stroke-width='2.7'/>` : '')
    + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
}
const nombreToken = (n) => '--ico-modal-' + n.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

const tokens = leer('src/styles/_tokens.scss');
const estilos = leer('src/styles.scss');

// Íconos que usa el mapa de styles.scss:  app-x { --icono-modal: var(--ico-modal-y); … }
const mapa = {};
for (const m of estilos.matchAll(/^(app-[a-z-]+)\s*\{\s*--icono-modal:\s*var\((--ico-modal-[a-z-]+)\)/gm)) mapa[m[1]] = m[2];

if (process.argv.includes('--tokens')) {
  const usados = new Set(Object.values(mapa));
  for (const [n, i] of Object.entries(ICONOS)) {
    if (usados.size && !usados.has(nombreToken(n))) continue;
    console.log(`  ${nombreToken(n)}: ${svgIcono(i)};`);
  }
  process.exit(0);
}

const fallos = [];
if (!Object.keys(mapa).length) fallos.push('styles.scss: no encuentro el mapa `app-… { --icono-modal: var(--ico-modal-…); }`');

// 1 y 2. Cada token usado existe y es igual al dibujo del Inicio.
const nombrePorToken = Object.fromEntries(Object.keys(ICONOS).map((n) => [nombreToken(n), n]));
for (const tok of new Set(Object.values(mapa))) {
  const m = tokens.match(new RegExp(`^\\s*${tok}:\\s*(url\\("[^"]+"\\));`, 'm'));
  if (!m) { fallos.push(`_tokens.scss: falta ${tok} (lo pide el mapa de styles.scss)`); continue; }
  const n = nombrePorToken[tok];
  if (!n) { fallos.push(`${tok}: no hay ICONOS.<nombre> en dashboard.ts con ese nombre`); continue; }
  if (m[1] !== svgIcono(ICONOS[n])) fallos.push(`${tok} ya no es el dibujo de ICONOS.${n} (dashboard.ts). Regenérelo: npm run verificar:iconos-modal -- --tokens`);
}

// 3. Todo componente con cabecera de modal mediana o grande está en el mapa.
const app = path.join(RAIZ, 'src', 'app');
(function recorrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { recorrer(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = fs.readFileSync(p, 'utf8');
    if (!html.includes('modal__head')) continue;
    const modales = [...html.matchAll(/class="modal(?:\s[^"]*)?"/g)].map((x) => x[0]);
    if (modales.length && modales.every((c) => /modal--(sm|sobre)\b/.test(c))) continue; // no llevan disco
    const ts = p.replace(/\.html$/, '.ts');
    const sel = fs.existsSync(ts) && fs.readFileSync(ts, 'utf8').match(/selector:\s*'([^']+)'/);
    const rel = path.relative(RAIZ, p).split(path.sep).join('/');
    if (!sel) { fallos.push(`${rel}: no encuentro el selector del componente`); continue; }
    if (!mapa[sel[1]]) fallos.push(`${rel}: <${sel[1]}> abre modales pero no está en el mapa de íconos de styles.scss (saldría sin disco)`);
  }
})(app);

if (fallos.length) {
  console.error(`verificar:iconos-modal · ${fallos.length} fallo(s):\n` + fallos.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`verificar:iconos-modal · OK (${Object.keys(mapa).length} componentes, ${new Set(Object.values(mapa)).size} íconos)`);

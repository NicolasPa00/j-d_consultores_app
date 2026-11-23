// Comprueba que las ACCIONES DE FILA se pinten solo con `button[appAccion]`
// (src/app/shared/icono/accion.ts) y que ninguna plantilla elija su tono a mano.
// Rediseño de íconos de tabla, 21-nov-2026 (docs/3-planes/rediseno-21-nov/iconos-tabla/plan-integracion.md §1.2).
//
//   npm run verificar:acciones
//
// Por qué: el tono (Ver en cian, Eliminar rojo, Archivar ámbar) sale del catálogo. Si alguien copia un
// botón viejo con su <svg> y su `icon-action--danger`, el color se desvía en silencio y vuelven los cinco
// dibujos distintos de papelera que había antes. Falla (código 1) si encuentra:
//   1. un modificador de tono escrito a mano (`icon-action--ver|danger|on|reversible|ok` o `accion--*`);
//   2. la clase `accion` escrita a mano (la pone el componente);
//   3. un `button[appAccion]` sin `etiqueta` (es el aria-label y el title: dice QUÉ se elimina);
//   4. un ojo de «Ver» dibujado a mano (`M2 12s…`) o un botón `.icon-action` dentro de `.row-actions`
//      (los de las tablas ya son `appAccion`; quedan los huecos, que no son botones);
//   5. (paso 7 del plan) una ✕ o un chevron dibujados a mano: un `<svg>` sin `appIcono` cuyo único
//      trazo es la ✕ o el chevron viejos de la retícula 24, o cualquier `<svg>` a mano dentro de un
//      botón `aria-label="Cerrar"`. Use `<svg appIcono="cerrar|anterior|siguiente|subir|bajar">`, que
//      dibuja el glifo de la familia (retícula 18, trazo 1,6, extremos redondos) al tamaño que ya le
//      da el CSS de cada vista. Las vistas que otros frentes tienen abiertas van en PENDIENTES: se
//      listan como aviso y no hacen fallar hasta que se conviertan.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'src', 'app');
const archivos = [];
(function recorrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) recorrer(p);
    else if (e.name.endsWith('.html')) archivos.push(p);
  }
})(RAIZ);

// La ✕ y los chevrones viejos (retícula 24). Si una plantilla los vuelve a pegar, falla.
const GLIFOS_VIEJOS = new Map([
  ['M18 6 6 18M6 6l12 12', 'cerrar'], ['M6 6l12 12M18 6 6 18', 'cerrar'], ['M6 18 18 6M6 6l12 12', 'cerrar'],
  ['m15 18-6-6 6-6', 'anterior'], ['m15 6-6 6 6 6', 'anterior'],
  ['m9 18 6-6-6-6', 'siguiente'], ['m9 6 6 6-6 6', 'siguiente'],
  ['m6 15 6-6 6 6', 'subir'], ['m18 15-6-6-6 6', 'subir'],
  ['m6 9 6 6 6-6', 'bajar'], ['m18 9-6 6-6-6', 'bajar'],
]);
// Vistas con otro frente abierto (21/22-nov): sus chevrones se convierten cuando ese frente cierre.
const PENDIENTES = new Set([
]);

const fallos = [];
const avisos = [];
const linea = (texto, i) => texto.slice(0, i).split('\n').length;
for (const archivo of archivos) {
  const t = fs.readFileSync(archivo, 'utf8');
  const rel = path.relative(path.resolve(RAIZ, '..', '..'), archivo).replace(/\\/g, '/');
  const anotar = (i, msg) => fallos.push(`${rel}:${linea(t, i)}  ${msg}`);

  for (const m of t.matchAll(/class="[^"]*\b(icon-action--(?:ver|danger|on|reversible|ok|sin-disco)|accion--[a-z-]+)\b/g)) {
    anotar(m.index, `tono escrito a mano (${m[1]}): lo pone el catálogo`);
  }
  for (const m of t.matchAll(/class="(?:[^"]*\s)?accion(?:\s[^"]*)?"/g)) {
    anotar(m.index, 'clase `accion` escrita a mano: use <button appAccion="…">');
  }
  for (const m of t.matchAll(/<button\b[^>]*\[?appAccion\]?=[^>]*>/g)) {
    if (!/\[?etiqueta\]?=/.test(m[0])) anotar(m.index, 'button[appAccion] sin etiqueta');
  }
  // El ojo dentro de un botón .icon-action (el de «mostrar contraseña» del login no cuenta).
  for (const m of t.matchAll(/<button\b[^>]*class="[^"]*\bicon-action\b[^>]*>[\s\S]*?<\/button>/g)) {
    if (m[0].includes('d="M2 12s')) anotar(m.index, 'ojo de «Ver» dibujado a mano: use appAccion="ver"');
  }
  // Botones .icon-action dentro de un bloque .row-actions (hasta su </div>).
  for (const m of t.matchAll(/<div class="[^"]*\brow-actions\b[^"]*"[^>]*>/g)) {
    const fin = t.indexOf('</div>', m.index);
    const bloque = t.slice(m.index, fin === -1 ? undefined : fin);
    for (const b of bloque.matchAll(/<button\b[^>]*class="[^"]*\bicon-action\b/g)) {
      anotar(m.index + b.index, 'acción de fila con .icon-action: use <button appAccion="…">');
    }
  }
  // 5. ✕ y chevrones dibujados a mano (paso 7).
  const glifo = (i, msg) => (PENDIENTES.has(rel) ? avisos : fallos).push(`${rel}:${linea(t, i)}  ${msg}`);
  for (const m of t.matchAll(/<svg\b(?![^>]*\bappIcono\b)[^>]*>([\s\S]*?)<\/svg>/g)) {
    const trazos = [...m[1].matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((p) => p[1].trim());
    const otros = m[1].replace(/<path\b[^>]*\/>/g, '').trim();
    if (trazos.length === 1 && !otros && GLIFOS_VIEJOS.has(trazos[0])) {
      glifo(m.index, `glifo dibujado a mano: use <svg appIcono="${GLIFOS_VIEJOS.get(trazos[0])}">`);
    }
  }
  for (const m of t.matchAll(/<button\b[^>]*\baria-label="Cerrar"[^>]*>[\s\S]*?<\/button>/g)) {
    if (/<svg\b(?![^>]*\bappIcono\b)/.test(m[0])) glifo(m.index, 'la ✕ de «Cerrar» va dibujada a mano: use <svg appIcono="cerrar">');
  }
}

if (avisos.length) {
  console.warn(`! ${avisos.length} glifo(s) a mano en vistas pendientes (no hacen fallar todavía):\n  ` + avisos.join('\n  '));
}
if (fallos.length) {
  console.error(`✗ ${fallos.length} problema(s) en las acciones de fila:\n  ` + fallos.join('\n  '));
  process.exit(1);
}
console.log(`✓ Acciones de fila: ${archivos.length} plantillas revisadas, sin tonos a mano ni botones viejos.`);

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
//      (los de las tablas ya son `appAccion`; quedan los huecos, que no son botones).
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

const fallos = [];
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
}

if (fallos.length) {
  console.error(`✗ ${fallos.length} problema(s) en las acciones de fila:\n  ` + fallos.join('\n  '));
  process.exit(1);
}
console.log(`✓ Acciones de fila: ${archivos.length} plantillas revisadas, sin tonos a mano ni botones viejos.`);

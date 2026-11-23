// Construye lamina.html (autocontenida) para la pasada de MODALES (21-nov-2026).
// Uso: node construir.mjs
// - Copia los tokens reales de src/styles/_tokens.scss (los que usa la lámina).
// - Réplica fiel del modal actual (src/styles.scss, «MODAL ESTÁNDAR») = ANTES.
// - Propuestas A, B y C como reglas con ámbito (.v-a, .v-b, .v-c) que en la app
//   irían SIN ámbito en styles.scss (ver propuesta.md).
// - Contrastes WCAG calculados aquí mismo y volcados a la lámina.
import fs from 'node:fs';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const REPO = path.resolve(AQUI, '../../../..');
const fuente = (p) => fs.readFileSync(path.join(REPO, 'public/fonts', p)).toString('base64');

// ------------------------------------------------------------------ contraste
const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const mezcla = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t))); // t de a
const aHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const T = {
  papel: '#f6f8fa', superficie: '#ffffff', hundida: '#eef2f6', cielo: '#e9f1f8', borde: '#e1e7ee',
  bordeControl: '#c3ceda', tinta: '#0f2a44', tinta2: '#44576c', tinta3: '#5c6f84', accion: '#13497a',
  accionTenue: '#e6eef6', accionTenueHover: '#d6e3ef', cian: '#1f9fcb', cianTrazo: '#1890bb',
  noche: '#0b1f33', nocheAlzada: '#163450', textoNoche: '#c3d2e2', textoNoche2: '#9fb3c6', iconoNoche: '#8fa6bd',
  info: '#1f5fc4', infoFondo: '#e7effd', ok: '#13683f', okFondo: '#e4f3eb', error: '#b42318', errorFondo: '#fdecea',
  aviso: '#7a5200', avisoFondo: '#fdf3d2', pie: '#fbfcfd', cerrarFondo: '#fdf1f0', blanco: '#ffffff',
};
const tinte = aHex(mezcla(hex(T.cian), hex(T.superficie), 0.58));
const contornoClaroSobreNoche = aHex(mezcla(hex('#ffffff'), hex(T.noche), 0.45));
const pillBordeInfo = aHex(mezcla(hex(T.info), hex('#ffffff'), 0.28));
const pillBordeOk = aHex(mezcla(hex(T.ok), hex('#ffffff'), 0.28));

const filas = [
  // [variante, qué, primer plano, fondo, mínimo, nota]
  ['Antes', 'Título 17/600', T.tinta, T.superficie, 4.5, ''],
  ['Antes', 'Subtítulo 13/400', T.tinta3, T.superficie, 4.5, ''],
  ['Antes', '✕ (ícono 16 px)', T.tinta2, T.superficie, 3, ''],
  ['Antes', 'Cabecera contra cuerpo', T.superficie, T.superficie, null, 'misma superficie: solo la línea --borde (1,27:1) separa'],
  ['Antes', '«Cancelar» --close', T.error, T.cerrarFondo, 4.5, 'legible, pero es el único color saturado del pie'],
  ['Antes', '«Guardar» deshabilitado', T.tinta3, T.hundida, 4.5, 'se lee, pero no se reconoce como el primario'],

  ['A', 'Título 20/600 sobre la franja', T.tinta, T.cielo, 4.5, ''],
  ['A', 'Subtítulo 13 en tinta-2', T.tinta2, T.cielo, 4.5, 'sube de tinta-3 a tinta-2'],
  ['A', '✕ (ícono 20 px)', T.tinta2, T.cielo, 3, ''],
  ['A y D', '✕ al pasar (tinta sobre acción-tenue-hover)', T.tinta, T.accionTenueHover, 3, 'regla :hover en el CSS (sustituye al rojo tenue)'],
  ['A y D', '✕ deshabilitada (tinta-inactiva sobre cielo)', '#8a96a6', T.cielo, null, 'deshabilitada: exenta de WCAG; se lee apagada, como el paginador'],
  ['A y D', 'Subtítulo con clase propia (.cp-sub) forzado a tinta-2', T.tinta2, T.cielo, 4.5, 'sin la regla de refuerzo quedaría en tinta-3: ' + ratio(T.tinta3, T.cielo).toFixed(2) + ':1'],
  ['A y D', '«Cancelar» al pasar (tinta sobre papel)', T.tinta, T.papel, 4.5, ''],
  ['D', 'Disco blanco contra la franja cielo', T.superficie, T.cielo, null, 'decorativo; lo que lo recorta es la sombra plana'],
  ['D', 'Sombra plana del disco (--ico-tinte) contra cielo', tinte, T.cielo, null, 'decorativa (la misma de los accesos del Inicio)'],
  ['D', 'Trazo del ícono (acción) sobre el disco blanco', T.accion, T.superficie, 3, ''],
  ['D', 'Acento del ícono (cian-trazo) sobre el disco blanco', T.cianTrazo, T.superficie, 3, ''],
  ['D', 'Título 20/600 / subtítulo tinta-2 sobre cielo', T.tinta2, T.cielo, 4.5, 'título tinta: 12,82'],
  ['A', 'Franja contra cuerpo blanco', T.cielo, T.superficie, null, 'decorativo: el cambio de plano separa; la línea va en --accion-tenue-hover'],
  ['A', 'Línea bajo la franja', T.accionTenueHover, T.superficie, null, 'decorativa'],
  ['A', 'Pastilla info en la franja (fondo blanco)', T.info, T.superficie, 4.5, 'la pastilla pasa a blanco con contorno de su tono'],
  ['A', 'Pastilla ok en la franja (fondo blanco)', T.ok, T.superficie, 4.5, ''],
  ['A', 'Contorno de la pastilla info', pillBordeInfo, T.cielo, null, 'decorativo: la pastilla lleva su palabra'],
  ['A', 'Botón «Editar» (contorno) sobre la franja', T.tinta, T.superficie, 4.5, 'el botón es blanco; su borde --borde-control contra cielo: ' + ratio(T.bordeControl, T.cielo).toFixed(2) + ':1 (decorativo, como hoy)'],

  ['B', 'Título 19/600', T.tinta, T.superficie, 4.5, ''],
  ['B', 'Subtítulo 13 en tinta-2', T.tinta2, T.superficie, 4.5, ''],
  ['B', 'Disco --cielo contra blanco', T.cielo, T.superficie, null, 'decorativo, igual que los accesos del Inicio'],
  ['B', 'Trazo del ícono (acción) sobre el disco', T.accion, T.cielo, 3, ''],
  ['B', 'Acento del ícono (cian-trazo) sobre el disco', T.cianTrazo, T.cielo, 3, 'el acento pasa; la forma la da el trazo en acción (como en el Inicio)'],
  ['B', 'Sombra plana (--ico-tinte) sobre el disco', tinte, T.cielo, null, 'decorativa'],
  ['B', '✕ (ícono 20 px)', T.tinta2, T.superficie, 3, ''],
  ['B', '«Cancelar» solo texto', T.tinta2, T.pie, 4.5, ''],

  ['C', 'Título 18/600 blanco sobre noche', T.blanco, T.noche, 4.5, ''],
  ['C', 'Subtítulo en --texto-noche', T.textoNoche, T.noche, 4.5, ''],
  ['C', '✕ en --icono-noche', T.iconoNoche, T.noche, 3, ''],
  ['C', '✕ al pasar (blanco sobre noche-alzada)', T.blanco, T.nocheAlzada, 3, ''],
  ['C', 'Foco en cian sobre noche', T.cian, T.noche, 3, 'el cian en el foco sobre noche ya está permitido (§1.3)'],
  ['C', 'Botón contorno claro: texto', T.blanco, T.noche, 4.5, ''],
  ['C', 'Botón contorno claro: borde 45 %', contornoClaroSobreNoche, T.noche, 3, ''],
  ['C', 'Pastilla info (su fondo) contra noche', T.infoFondo, T.noche, null, 'la pastilla conserva su fondo claro: destaca de sobra'],
  ['C', 'Cabecera contra cuerpo blanco', T.noche, T.superficie, null, 'separación máxima'],

  ['Pie (A, C, D)', '«Cancelar» contorno: texto', T.tinta, T.superficie, 4.5, ''],
  ['Pie (A, C, D)', '«Cancelar» contorno: borde', T.bordeControl, T.pie, null, 'decorativo, como todo secundario'],
  ['Pie (todas)', 'Primario deshabilitado: SIN CAMBIO (tinta-3 sobre hundida)', T.tinta3, T.hundida, 4.5, 'se deja como hoy; ponerlo en cielo solo en el pie creaba dos deshabilitados distintos'],
  ['Pie (todas)', 'Primario habilitado', T.blanco, T.accion, 4.5, 'sin cambio'],
];
const tablaContraste = filas.map(([v, q, a, b, min, nota]) => {
  const r = ratio(a, b);
  const ok = min == null ? '<span class="cx cx--deco">decorativo</span>' : r >= min ? `<span class="cx cx--ok">pasa ≥${String(min).replace('.', ',')}</span>` : `<span class="cx cx--no">no llega a ${String(min).replace('.', ',')}</span>`;
  return `<tr><td>${v}</td><td>${q}</td><td><span class="mu" style="background:${a}"></span><code>${a}</code></td><td><span class="mu" style="background:${b}"></span><code>${b}</code></td><td class="num"><b>${r.toFixed(2).replace('.', ',')}:1</b></td><td>${ok}</td><td>${nota}</td></tr>`;
}).join('\n');

// ------------------------------------------------------------------ íconos del Inicio (fuente: dashboard.ts)
const DASH = fs.readFileSync(path.join(REPO, 'src/app/pages/dashboard/dashboard.ts'), 'utf8');
const ini = DASH.indexOf('const ICONOS = {');
const fin = DASH.indexOf('} satisfies Record<string, IconoAcceso>;', ini);
const ICONOS_INICIO = new Function('return ' + DASH.slice(ini + 'const ICONOS = '.length, fin + 1))();
// Componente que abre modales → ícono de su módulo (los 20 con .modal__head).
const MAPA_D = {
  'app-nomina': 'nomina', 'app-validation': 'ordenes', 'app-facturacion': 'factura', 'app-terceros': 'tercero',
  'app-compras': 'compra', 'app-documentos-soporte': 'compra', 'app-cartera': 'cartera', 'app-pagos': 'cartera',
  'app-billing': 'cuentas', 'app-companies': 'empresas', 'app-professionals': 'profesionales', 'app-import': 'importar',
  'app-contabilidad': 'contabilidad', 'app-activos': 'contabilidad', 'app-comprobantes': 'contabilidad', 'app-periodos': 'contabilidad',
  'app-informes-contables': 'informesContables', 'app-parametrizacion': 'configuracion',
  'app-tercero-rapido': 'tercero', 'app-producto-rapido': 'factura',
};
for (const v of Object.values(MAPA_D)) if (!ICONOS_INICIO[v]) throw new Error('ícono inexistente ' + v);
// ------------------------------------------------------------------ íconos del tema (B)
// Mismos dibujos de los accesos del Inicio (dashboard.ts · ICONOS), un ícono por módulo.
const ICO = {
  nomina: { forma: 'M9 5h18a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', trazos: 'M12 25h12M12 29h7', acento: 'M18 9a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7Z M12.5 22a5.5 5.5 0 0 1 11 0' },
  ordenes: { forma: 'M8 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z', tapa: 'M14 4.5h8a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z', trazos: 'M18.5 16h5.5M18.5 22h5.5M18.5 28h3.5', acento: 'M12 15.8l1.4 1.4 2.4-2.6M12 21.8l1.4 1.4 2.4-2.6' },
  factura: { forma: 'M9 5h13l7 7v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', trazos: 'M22 5v7h7M11.5 22h13M11.5 27h8', acento: 'M11.5 15.5l2.2 2.2 4.3-4.7' },
  tercero: { forma: 'M5 9a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z', trazos: 'M20.5 14h6.5M20.5 19h6.5M20.5 24h4', acento: 'M13 12a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z M8.5 25.5a4.5 4.5 0 0 1 9 0' },
};
const icoUri = (i) => {
  const sil = i.forma + (i.tapa ? ' ' + i.tapa : '');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' fill='none' stroke-linecap='round' stroke-linejoin='round'>`
    + `<path d='${sil}' fill='${tinte}' transform='translate(3 3)'/>`
    + `<path d='${i.forma}' fill='#ffffff' stroke='${T.accion}' stroke-width='2.4'/>`
    + (i.tapa ? `<path d='${i.tapa}' fill='#ffffff' stroke='${T.accion}' stroke-width='2.4'/>` : '')
    + (i.trazos ? `<path d='${i.trazos}' stroke='${T.accion}' stroke-width='2.4'/>` : '')
    + `<path d='${i.acento}' stroke='${T.cianTrazo}' stroke-width='2.7'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;
};

// ------------------------------------------------------------------ CSS base (réplica)
const X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const LAPIZ = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const PDF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`;
const VISTO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>`;

const CSS_BASE = `
@font-face{font-family:'Inter';font-weight:400;src:url(data:font/woff2;base64,${fuente('inter-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:'Inter';font-weight:500;src:url(data:font/woff2;base64,${fuente('inter-latin-500-normal.woff2')}) format('woff2')}
@font-face{font-family:'Inter';font-weight:600 700;src:url(data:font/woff2;base64,${fuente('inter-latin-600-normal.woff2')}) format('woff2')}
:root{
  --papel:#f6f8fa;--superficie:#fff;--hundida:#eef2f6;--cielo:#e9f1f8;--borde:#e1e7ee;--borde-control:#c3ceda;--borde-control-hover:#aebdcc;--borde-campo:#8496aa;
  --tinta:#0f2a44;--tinta-2:#44576c;--tinta-3:#5c6f84;--accion:#13497a;--accion-hover:#0e3a62;--accion-tenue:#e6eef6;--accion-tenue-hover:#d6e3ef;
  --cian:#1f9fcb;--cian-trazo:#1890bb;--noche:#0b1f33;--noche-alzada:#163450;--texto-noche:#c3d2e2;--texto-noche-2:#9fb3c6;--icono-noche:#8fa6bd;
  --aviso:#7a5200;--aviso-fondo:#fdf3d2;--ambar:#c27c0e;--info:#1f5fc4;--info-fondo:#e7effd;--ok:#13683f;--ok-fondo:#e4f3eb;--error:#b42318;--error-fondo:#fdecea;--cerrar-fondo:#fdf1f0;
  --cabecera-tabla:#f3f6f9;--tinta-inactiva:#8a96a6;--papel-h:#f6f8fa;--pie-modal:#fbfcfd;--carril:#d5dee8;
  --ico-tinte:color-mix(in srgb,var(--cian) 58%,var(--superficie));
  --fuente:'Inter',system-ui,sans-serif;--fs-pastilla:11.5px;--fs-meta:12px;--fs-celda:13px;--fs-base:14px;--fs-modal:17px;
  --e-1:4px;--e-2:8px;--e-3:12px;--e-4:16px;--e-5:20px;--e-6:24px;--r-control:6px;--r-tarjeta:10px;--r-modal:12px;--r-completo:999px;
  --sombra-modal:0 24px 56px -20px rgb(15 42 68 / 38%),0 2px 6px rgb(15 42 68 / 8%);--velo:rgb(11 31 51 / 50%);
  --halo:0 0 0 4px rgb(19 73 122 / 16%);
  --modal-w-sm:480px;--modal-w-md:640px;--modal-w-lg:880px;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:var(--fuente);background:var(--papel);color:var(--tinta);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;accent-color:var(--accion)}
app-nomina,app-validation,app-facturacion,app-terceros,app-tercero-rapido,app-compras{display:contents}
.modal-backdrop--sobre{z-index:70}.modal--sobre{z-index:71}
h1,h2,h3,h4,p{margin:0}

/* ---------- botones ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:0 14px;font:500 14px/1.2 var(--fuente);color:var(--tinta);background:var(--superficie);border:1px solid transparent;border-radius:var(--r-control);white-space:nowrap;cursor:pointer}
.btn svg{width:16px;height:16px;flex:none}
.btn--primary{background:var(--accion);color:#fff}
.btn--secondary,.btn--ghost{background:var(--superficie);color:var(--tinta);border-color:var(--borde-control)}
.btn--close{background:var(--cerrar-fondo);color:var(--error);border-color:transparent}
.btn--peligro-contorno{background:var(--superficie);color:var(--error);border-color:var(--borde-control)}
.btn--sm{min-height:30px;padding:0 10px;gap:6px;font-size:13px}
.btn--sm svg{width:15px;height:15px}
.btn:disabled{background:var(--hundida);color:var(--tinta-3);border-color:var(--borde);cursor:not-allowed}
.icon-action{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;color:var(--tinta-2);background:transparent;border:0;border-radius:var(--r-control);cursor:pointer}
.icon-action svg{width:16px;height:16px}
.icon-action:disabled{color:var(--tinta-inactiva);background:transparent;cursor:not-allowed}
/* hovers de HOY; .es-hover los fuerza en la lámina */
.btn--close:hover:not(:disabled),.btn--close.es-hover{background:var(--error-fondo)}
.modal__head .icon-action[aria-label='Cerrar']:hover:not(:disabled),.modal__head .icon-action[aria-label='Cerrar'].es-hover{background:var(--cerrar-fondo);color:var(--error)}
/* Compras: su subtítulo propio, con el encapsulado de Angular (atributo _ngcontent) */
.cp-sub[_ngcontent-cp]{display:block;margin-top:2px;font-size:13px;color:var(--tinta-3)}

/* ---------- campos ---------- */
.form-field__label{display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:var(--tinta-2)}
.form-control{width:100%;min-height:40px;padding:.5rem .75rem;font:14px/1.4 var(--fuente);color:var(--tinta);background:var(--superficie);border:1px solid var(--borde-campo);border-radius:var(--r-control)}
.form-control::placeholder{color:var(--tinta-3)}
select.form-control{appearance:none;padding-right:2.25rem;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235c6f84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center;background-size:16px}
.form-field__hint{display:block;margin:6px 0 0;font-size:12px;color:var(--tinta-3)}
.section-head{display:flex;align-items:center;gap:12px;margin:8px 0 0}
.section-head::after{content:'';flex:1;height:1px;background:var(--borde)}
.section-tag{font-size:14px;font-weight:600;color:var(--tinta);white-space:nowrap}

/* ---------- pastillas ---------- */
.pill{display:inline-flex;align-items:center;gap:6px;min-height:22px;padding:0 8px;border-radius:var(--r-completo);font-size:11.5px;font-weight:600;line-height:1.2;letter-spacing:.02em;white-space:nowrap;color:var(--tinta-2);background:var(--hundida)}
.pill::before{content:'';flex:none;width:6px;height:6px;border-radius:50%;background:currentColor}
.pill--info{background:var(--info-fondo);color:var(--info)}
.pill--success{background:var(--ok-fondo);color:var(--ok)}
.pill--warning{background:var(--aviso-fondo);color:var(--aviso)}
.pill--warning::before{background:var(--ambar)}
.pill.doc-estado{border-radius:var(--r-control);font-size:12px;font-weight:500;letter-spacing:0;gap:5px}
.doc-estado.pill--success::before{width:11px;height:11px;border-radius:0;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/contain no-repeat}

/* ---------- MODAL (réplica de styles.scss «MODAL ESTÁNDAR») ---------- */
.modal-backdrop{position:absolute;inset:0;z-index:50;background:var(--velo)}
.modal{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:51;display:flex;flex-direction:column;width:min(var(--modal-w-md),calc(100% - 2rem));max-height:calc(100% - 2rem);background:var(--superficie);border-radius:var(--r-modal);box-shadow:var(--sombra-modal);overflow:hidden}
.modal--sm{width:min(var(--modal-w-sm),calc(100% - 2rem))}
.modal--lg{width:min(var(--modal-w-lg),calc(100% - 2rem))}
.modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 16px 16px 24px;background:var(--superficie);border-bottom:1px solid var(--borde)}
.modal__head>div,.modal__head>.modal__title{flex:1;min-width:0}
.modal__title{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0;font-size:var(--fs-modal);font-weight:600;letter-spacing:-.01em;color:var(--tinta)}
.modal__sub{margin:3px 0 0;font-size:13px;color:var(--tinta-3)}
.modal__sub-conf{color:var(--tinta-3)}
.modal__head>.modal__head-actions{flex:0 0 auto}
.modal__head-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.modal__head .icon-action[aria-label='Cerrar']{width:32px;height:32px}
.modal__body{display:flex;flex-direction:column;gap:16px;flex:1 1 auto;overflow-y:auto;padding:20px 24px}
.modal__body>*{flex-shrink:0}
.modal__footer{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding:14px 24px;background:var(--pie-modal);border-top:1px solid var(--borde)}
.modal__status{margin-right:auto;font-size:13px;color:var(--tinta-3)}
.modal__status strong{color:var(--tinta);font-weight:600}
.modal__footer-actions{display:flex;gap:10px}
/* celular (≤640): en la lámina lo activa .movil en vez de la @media */
.movil .modal{width:calc(100% - 24px);max-height:calc(100% - 24px)}
.movil .modal__head{padding:16px 12px 14px 16px}
.movil .modal__body{padding:16px}
.movil .modal__footer{padding:12px 16px 12px}
.movil .form-control{min-height:44px;font-size:16px}

/* ---------- contenidos de cada modal (copiados de sus hojas) ---------- */
.nom-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.75rem 1rem;margin-bottom:.9rem}
.nom-grid__ancho{grid-column:span 2}
.movil .nom-grid__ancho{grid-column:auto}
.nom-checks{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;margin-bottom:1rem;font-size:13px}
.nom-checks label{display:inline-flex;align-items:center;gap:.4rem}
.doc-row{display:flex;align-items:center;gap:.85rem;padding:.7rem .9rem;background:var(--papel);border:1px solid var(--borde);border-radius:10px}
.doc-row__icon{flex:none;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid var(--borde);border-radius:6px;background:#fff;color:var(--tinta-2)}
.doc-row__icon svg{width:22px;height:22px}
.doc-row__meta{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.35}
.doc-row__name{font-weight:600;color:var(--tinta)}
.doc-row__sub{font-size:12px;color:var(--tinta-3)}
.lect{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 24px}
.movil .lect{grid-template-columns:1fr}
.lect div{display:flex;flex-direction:column;gap:2px}
.lect span{font-size:13px;font-weight:500;color:var(--tinta-2)}
.lect b{font-weight:500;color:var(--tinta)}
.fac-pasos{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);margin:0 0 .9rem;padding:0;list-style:none}
.fac-paso{position:relative;display:flex;flex-direction:column;align-items:center;gap:.3rem;text-align:center;color:var(--tinta-3)}
.fac-paso::before{content:'';position:absolute;top:10px;right:50%;left:-50%;height:3px;background:var(--carril)}
.fac-paso:first-child::before{display:none}
.fac-paso--hecho::before,.fac-paso--actual::before{background:var(--ok)}
.fac-paso__punto{position:relative;z-index:1;display:grid;place-items:center;width:22px;height:22px;border:2px solid var(--borde-control);border-radius:50%;background:#fff;color:#fff}
.fac-paso__punto svg{width:12px;height:12px}
.fac-paso--hecho .fac-paso__punto{border-color:var(--ok);background:var(--ok)}
.fac-paso--actual .fac-paso__punto{border-color:var(--accion);box-shadow:var(--halo)}
.fac-paso__etiqueta{font-size:12px;font-weight:600;color:var(--tinta-2)}
.fac-paso__fecha{font-size:11.5px;color:var(--tinta-3)}
.movil .fac-pasos{grid-auto-flow:row;gap:.55rem}
.movil .fac-paso{flex-direction:row;text-align:left;gap:.6rem}
.movil .fac-paso::before{display:none}
.movil .fac-paso__fecha{margin-left:auto}
.fac-datos{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}
.movil .fac-datos{grid-template-columns:repeat(2,1fr)}
.fac-datos div{display:flex;flex-direction:column;gap:.15rem}
.fac-datos span{font-size:12px;color:var(--tinta-3)}
.fac-datos b{font-weight:600}
.tabla{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--borde);border-radius:10px;overflow:hidden}
.tabla th{height:38px;padding:0 12px;background:var(--cabecera-tabla);color:var(--tinta-2);font-size:12px;font-weight:600;text-align:left;border-bottom:1px solid var(--borde)}
.tabla td{padding:10px 12px;border-bottom:1px solid var(--borde)}
.num,.tabla th.num{text-align:right;font-variant-numeric:tabular-nums}
.fac-pie__espacio{flex:1}
.movil .fac-pie{gap:8px;justify-content:flex-start}
.movil .fac-pie .fac-pie__espacio{flex-basis:100%;height:0}
.movil .fac-pie>.btn--close{margin-left:auto}
.mono{font-variant-numeric:tabular-nums}

/* ---------- página falsa detrás del velo ---------- */
.escena{position:relative;overflow:hidden;border-radius:10px;border:1px solid var(--borde);background:var(--papel);isolation:isolate}
.escena--ancha{width:1360px;height:700px}
.escena--media{width:760px;height:560px}
.escena.movil{width:390px;height:800px;border-radius:28px;border:8px solid #1b2a3a}
.fp{position:absolute;inset:0;display:grid;grid-template-columns:232px 1fr}
.fp__menu{background:var(--noche);padding:20px 14px;display:flex;flex-direction:column;gap:6px}
.fp__logo{height:26px;width:110px;border-radius:6px;background:#163450;margin:0 6px 18px}
.fp__item{height:34px;border-radius:7px;display:flex;align-items:center;padding:0 12px;color:var(--texto-noche);font-size:14px}
.fp__item--on{background:var(--noche-alzada);box-shadow:inset 3px 0 0 var(--cian);color:#fff}
.fp__main{display:flex;flex-direction:column}
.fp__barra{height:60px;background:#fff;border-bottom:1px solid var(--borde)}
.fp__cont{padding:28px 32px}
.fp__titulo{font-size:24px;font-weight:600;margin-bottom:18px}
.fp__tabla{background:#fff;border:1px solid var(--borde);border-radius:10px;overflow:hidden}
.fp__fila{height:46px;border-bottom:1px solid var(--borde);display:flex;align-items:center;gap:40px;padding:0 16px;font-size:13px;color:var(--tinta-2)}
.fp__fila:first-child{background:var(--cabecera-tabla);height:38px;font-weight:600;font-size:12px}
.movil .fp{grid-template-columns:1fr}
.movil .fp__menu{display:none}
`;

// ------------------------------------------------------------------ PROPUESTAS
// S = ámbito. En la lámina «.v-a», en la app «» (reglas globales de styles.scss).
// L = true en la lámina: los :hover se escriben sin @media y con .es-hover para poder fotografiarlos.
const HOV = (sel, L) => L ? `${sel}:hover:not(:disabled),${sel}.es-hover` : `${sel}:hover:not(:disabled)`;
const MEDIA_HOVER = (css, L) => L ? css : `@media (hover: hover) and (pointer: fine) {${css}}`;
const CSS_A = (S, L = true, nombre = 'A · Franja en cielo') => `
/* ${nombre} */
${S || ':root'}{--fs-modal:20px}  /* en la app: _tokens.scss, --fs-modal 17 → 20 */
${S} .modal__head{background:var(--cielo);border-bottom-color:var(--accion-tenue-hover);padding:20px 16px 18px 24px}
${S} .modal__title{line-height:1.3;letter-spacing:-.015em}
${S} .modal__sub{margin-top:4px;color:var(--tinta-2);line-height:1.45;max-width:78ch;text-wrap:pretty}
${S} .modal .modal__head > div > :is(small,p){color:var(--tinta-2)}  /* gana a .cp-sub/.cmp-sub/.af-sub/.ic-sub encapsuladas */
${S} .modal__head .icon-action[aria-label='Cerrar']{width:36px;height:36px;margin:-4px -2px 0 0;color:var(--tinta-2)}
${S} .modal__head .icon-action[aria-label='Cerrar'] svg{width:20px;height:20px}
${S} .modal__head .icon-action[aria-label='Cerrar']:disabled{color:var(--tinta-inactiva);background:transparent}
${S} .modal__head .pill:not(.pill--finalizada){background:var(--superficie);box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 28%,transparent)}
${S} .btn--close{background:var(--superficie);color:var(--tinta);border-color:var(--borde-control)}
${MEDIA_HOVER(`
${HOV(S + " .modal__head .icon-action[aria-label='Cerrar']", L)}{background:var(--accion-tenue-hover);color:var(--tinta)}
${HOV(S + ' .btn--close', L)}{background:var(--papel);border-color:var(--borde-control-hover);color:var(--tinta)}
`, L)}
${S}.movil,${S} .movil{--fs-modal:18px}
${S}.movil .modal__head,${S} .movil .modal__head{padding:16px 10px 14px 16px}
`;
const CSS_B = (S) => `
/* B · Disco del tema */
${S} app-nomina{--icono-modal:${icoUri(ICO.nomina)}}
${S} app-validation{--icono-modal:${icoUri(ICO.ordenes)}}
${S} app-facturacion{--icono-modal:${icoUri(ICO.factura)}}
${S} app-terceros{--icono-modal:${icoUri(ICO.tercero)}}
${S} .modal__head{padding:18px 16px 18px 20px}
${S} .modal__head::before{content:'';flex:none;width:44px;height:44px;border-radius:50%;background:var(--cielo) var(--icono-modal,none) center/30px no-repeat}
${S} .modal__head>div,${S} .modal__head>.modal__title{align-self:center}
${S} .modal__title{font-size:19px;line-height:1.3;letter-spacing:-.015em}
${S} .modal__sub{margin-top:2px;color:var(--tinta-2);line-height:1.45;max-width:78ch;text-wrap:pretty}
${S} .modal__head .icon-action[aria-label='Cerrar']{width:36px;height:36px;color:var(--tinta-2)}
${S} .modal__head .icon-action[aria-label='Cerrar'] svg{width:20px;height:20px}
${S} .btn--close{background:transparent;color:var(--tinta-2);border-color:transparent}
${S}.movil .modal__head,${S} .movil .modal__head{padding:14px 10px 14px 14px;gap:12px}
${S}.movil .modal__head::before,${S} .movil .modal__head::before{width:36px;height:36px;background-size:24px}
${S}.movil .modal__title,${S} .movil .modal__title{font-size:17px}
`;
const CSS_C = (S) => `
/* C · Cabecera en noche */
${S} .modal__head{background:var(--noche);border-bottom:0;padding:18px 16px 18px 24px}
${S} .modal__title{color:#fff;font-size:18px;line-height:1.3}
${S} .modal__sub,${S} .modal__head .modal__sub-conf{color:var(--texto-noche);line-height:1.45;max-width:78ch;text-wrap:pretty}
${S} .modal__head .icon-action{color:var(--icono-noche)}
${S} .modal__head .icon-action[aria-label='Cerrar']{width:36px;height:36px;margin:-3px -2px 0 0}
${S} .modal__head .icon-action[aria-label='Cerrar'] svg{width:20px;height:20px}
${S} .modal__head .icon-action:focus-visible{outline:2px solid var(--cian);outline-offset:2px}
${S} .modal__head .btn--ghost,${S} .modal__head .btn--secondary{background:transparent;color:#fff;border-color:rgb(255 255 255 / 45%)}
${S} .btn--close{background:var(--superficie);color:var(--tinta);border-color:var(--borde-control)}
${S}.movil .modal__head,${S} .movil .modal__head{padding:16px 10px 14px 16px}
${S}.movil .modal__title,${S} .movil .modal__title{font-size:17px}
`;
const HOSTS_D = Object.keys(MAPA_D);
const CSS_D = (S, L = true) => CSS_A(S, L, 'D · Franja en cielo + disco del tema') + `
/* Ícono por componente. Un componente que NO está en el mapa no pinta disco (nada de círculos vacíos). */
${HOSTS_D.map((h) => `${S} ${h}{--icono-modal:${icoUri(ICONOS_INICIO[MAPA_D[h]])}}`).join('\n')}
/* Disco BLANCO sobre la franja (un disco cielo sobre cielo desaparece) con la sombra plana cian del Inicio. */
${S} :is(${HOSTS_D.join(',')}) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head{padding-left:20px}
${S} :is(${HOSTS_D.join(',')}) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head > div{align-self:center}
${S} :is(${HOSTS_D.join(',')}) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head::before{content:'';flex:none;align-self:center;width:44px;height:44px;border-radius:50%;background:var(--superficie) var(--icono-modal) center/30px no-repeat;box-shadow:2px 2px 0 var(--ico-tinte)}
${S}.movil .modal__head::before,${S} .movil .modal__head::before{width:36px;height:36px;background-size:24px}
${S}.movil .modal__head,${S} .movil .modal__head{gap:12px;padding-left:14px}
`;
fs.writeFileSync(path.join(AQUI, 'propuestas.css'),
  '/* Reglas de cada propuesta tal como irían en src/styles.scss (sin ámbito). Generado por construir.mjs. */\n'
  + CSS_A('', false).replace(/\.movil /g, '@movil ') + '\n' + CSS_B('').replace(/\.movil /g, '@movil ') + '\n' + CSS_C('').replace(/\.movil /g, '@movil ') + '\n' + CSS_D('', false).replace(/\.movil /g, '@movil ')
  + '\n/* «@movil X» = dentro de @media (max-width: 640px) { X }. */\n');

// ------------------------------------------------------------------ modales de muestra
const cerrar = (dis) => `<button type="button" class="icon-action" aria-label="Cerrar"${dis ? '' : ''}>${X}</button>`;
const head = ({ titulo, pill = '', sub = '', acciones = '', x = true }) => `
  <header class="modal__head">
    <div>
      <h3 class="modal__title">${titulo}${pill}</h3>
      ${sub ? `<p class="modal__sub">${sub}</p>` : ''}
    </div>
    ${acciones ? `<div class="modal__head-actions">${acciones}${x ? cerrar() : ''}</div>` : x ? cerrar() : ''}
  </header>`;

const campo = (l, ctrl, hint = '', cls = '') => `<div class="form-field ${cls}"><label class="form-field__label">${l}</label>${ctrl}${hint ? `<p class="form-field__hint">${hint}</p>` : ''}</div>`;
const inp = (v = '', ph = '') => `<input class="form-control" type="text" value="${v}" placeholder="${ph}">`;
const sel = (v) => `<select class="form-control"><option>${v}</option></select>`;

const M_EMPLEADO = `<app-nomina><div class="modal-backdrop"></div>
<div class="modal modal--lg" role="dialog">
  ${head({ titulo: 'Nuevo empleado', sub: 'El contrato y cómo se le paga. El documento, la dirección y el municipio se mantienen en Terceros.' })}
  <div class="modal__body">
    <div class="nom-grid">
      ${campo('Persona *', inp('', 'Nombre o documento…'), 'Solo personas naturales de Terceros que aún no tienen ficha.', 'nom-grid__ancho')}
      ${campo('Cargo', inp())}
      ${campo('Correo', inp(), 'Para enviarle el desprendible')}
      ${campo('Salario mensual *', inp('1423500'))}
      ${campo('Tipo de contrato *', sel('Término indefinido'))}
      ${campo('Tipo de trabajador *', sel('Dependiente'))}
      ${campo('Fecha de ingreso *', inp('01/11/2026'))}
      ${campo('Fecha de retiro', inp('', 'dd/mm/aaaa'))}
    </div>
    <div class="nom-checks"><label><input type="checkbox"> Salario integral</label><label><input type="checkbox"> Actividad de alto riesgo</label><label><input type="checkbox"> Pensionado por vejez activo</label></div>
    <h4 class="section-head"><span class="section-tag">Cómo se le paga</span></h4>
    <div class="nom-grid">${campo('Medio de pago *', sel('Transferencia débito bancaria'))}${campo('Banco *', inp('Bancolombia'))}${campo('Tipo de cuenta *', sel('Ahorros'))}</div>
  </div>
  <footer class="modal__footer">
    <button type="button" class="btn btn--close">Cancelar</button>
    <button type="button" class="btn btn--primary" disabled>Guardar</button>
  </footer>
</div></app-nomina>`;

const M_ORDEN = `<app-validation><div class="modal-backdrop"></div>
<div class="modal modal--lg" role="dialog">
  ${head({ titulo: 'Detalle de la orden', sub: 'Industrias del Valle S.A.S. · BOLÍVAR<span class="modal__sub-conf"> (92% confianza ARL)</span>', acciones: `<button type="button" class="btn btn--ghost btn--sm">${LAPIZ} Editar</button>` })}
  <div class="modal__body">
    <div class="doc-row"><span class="doc-row__icon">${PDF}</span><span class="doc-row__meta"><span class="doc-row__name">OS-2026-0412.pdf</span><span class="doc-row__sub">PDF · importado el 19-nov-2026 a las 8:42</span></span><button class="btn btn--ghost btn--sm">Ver PDF</button></div>
    <h4 class="section-head"><span class="section-tag">Datos de la orden</span></h4>
    <div class="lect">
      <div><span>Número de OS</span><b class="mono">OS-2026-0412</b></div><div><span>Empresa</span><b>Industrias del Valle S.A.S.</b></div><div><span>NIT</span><b>900.123.456-7</b></div>
      <div><span>Ciudad</span><b>Cali</b></div><div><span>Servicio</span><b>Inspección de seguridad</b></div><div><span>Horas</span><b class="mono">4</b></div>
      <div><span>Fecha límite</span><b>28-nov-2026</b></div><div><span>Contacto</span><b>Coordinación SST</b></div><div><span>Asesor ARL</span><b>—</b></div>
    </div>
    <h4 class="section-head"><span class="section-tag">Actividades</span></h4>
    <div class="lect"><div><span>Descripción</span><b>Inspección de áreas de trabajo y señalización</b></div></div>
  </div>
  <footer class="modal__footer">
    <span class="modal__status">Estado actual: <strong>SIN PROGRAMAR</strong></span>
    <div class="modal__footer-actions"><button type="button" class="btn btn--close">Cerrar</button></div>
  </footer>
</div></app-validation>`;

const paso = (e, l, f) => `<li class="fac-paso fac-paso--${e}"><span class="fac-paso__punto">${e === 'hecho' ? VISTO : ''}</span><span class="fac-paso__etiqueta">${l}</span>${f ? `<span class="fac-paso__fecha">${f}</span>` : ''}</li>`;
const M_FACTURA = `<app-facturacion><div class="modal-backdrop"></div>
<div class="modal modal--lg modal--factura" role="dialog">
  ${head({ titulo: 'Factura FE1027', pill: '<span class="pill doc-estado pill--success">Validada</span>', sub: 'Compañía de Seguros Bolívar S.A. · prefactura 162914 · ref. ORB-1027' })}
  <div class="modal__body">
    <ol class="fac-pasos">${paso('hecho', 'Borrador', '18-nov 9:10')}${paso('hecho', 'Enviada a la DIAN', '18-nov 9:12')}${paso('hecho', 'Validada', '18-nov 9:12')}${paso('actual', 'Enviada al cliente')}${paso('', 'Pagada')}</ol>
    <div class="fac-datos"><div><span>Emisión</span><b>18-nov-2026</b></div><div><span>Vencimiento</span><b>18-dic-2026</b></div><div><span>Forma de pago</span><b>Crédito 30 días</b></div><div><span>Medio de pago</span><b>Transferencia</b></div></div>
    <table class="tabla"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Valor</th></tr></thead><tbody><tr><td>Asesoría SST · horas ejecutadas</td><td class="num">12</td><td class="num">1.440.000</td></tr><tr><td>Transporte</td><td class="num">1</td><td class="num">85.000</td></tr></tbody></table>
  </div>
  <footer class="modal__footer fac-pie">
    <button type="button" class="btn btn--secondary">Ver factura</button>
    <button type="button" class="btn btn--ghost">PDF</button><button type="button" class="btn btn--ghost">XML</button><button type="button" class="btn btn--ghost">Paquete para la ARL</button>
    <span class="fac-pie__espacio"></span>
    <button type="button" class="btn btn--ghost">Nota crédito</button>
    <button type="button" class="btn btn--close">Cerrar</button>
  </footer>
</div></app-facturacion>`;

const M_ENVIAR = `<app-facturacion><div class="modal-backdrop"></div>
<div class="modal modal--sm" role="dialog">
  ${head({ titulo: 'Enviar la factura al cliente', sub: 'FE1027 · Compañía de Seguros Bolívar S.A.' })}
  <div class="modal__body">
    <label class="form-field"><span class="form-field__label">Correo del cliente</span>${inp('facturacion@cliente.com.co')}</label>
    <p class="form-field__hint" style="font-size:13px">Se envía el correo oficial de la DIAN: un .zip con el PDF de ORBITA (con las retenciones) y el XML.</p>
  </div>
  <footer class="modal__footer">
    <button type="button" class="btn btn--close">Cancelar</button>
    <button type="button" class="btn btn--primary">Enviar</button>
  </footer>
</div></app-facturacion>`;

const M_SOBRE = `<app-facturacion><div class="modal-backdrop"></div>
<div class="modal modal--lg" role="dialog">${head({ titulo: 'Nueva factura manual', sub: 'Para facturar algo que no viene de una orden de servicio. Queda en «Pendientes» como borrador: no sale a la DIAN hasta que se emita.' })}
  <div class="modal__body"><div class="nom-grid">${campo('Cliente *', inp('', 'Nombre o documento…'), '¿No aparece? Crear cliente sin salir de esta ventana.', 'nom-grid__ancho')}${campo('Forma de pago *', sel('Crédito 30 días'))}</div><div style="height:300px"></div></div>
  <footer class="modal__footer"><button type="button" class="btn btn--close">Cancelar</button><button type="button" class="btn btn--primary" disabled>Guardar borrador</button></footer>
</div>
<app-tercero-rapido><div class="modal-backdrop modal-backdrop--sobre"></div>
<div class="modal modal--lg modal--sobre" role="dialog">${head({ titulo: 'Nuevo cliente', sub: 'Solo lo necesario para facturarle. El resto se completa después en Terceros.' })}
  <div class="modal__body"><div class="nom-grid">${campo('Tipo de documento *', sel('NIT'))}${campo('Número *', inp('900123456'))}${campo('Razón social *', inp(), '', 'nom-grid__ancho')}</div></div>
  <footer class="modal__footer"><button type="button" class="btn btn--close">Cancelar</button><button type="button" class="btn btn--primary">Crear cliente</button></footer>
</div></app-tercero-rapido></app-facturacion>`;

const M_COMPRA = `<app-compras><div class="modal-backdrop"></div>
<div class="modal modal--lg" role="dialog">
  <header class="modal__head">
    <div>
      <h3 class="modal__title">Factura de compra FV-8812</h3>
      <small class="cp-sub" _ngcontent-cp>Papelería del Sur S.A.S. · 12/11/2026 · CC-0187 · a crédito, vence 12/12/2026</small>
    </div>
    <div class="modal__head-actions"><span class="pill pill--success">Contabilizada</span>${cerrar()}</div>
  </header>
  <div class="modal__body">
    <table class="tabla"><thead><tr><th>Concepto</th><th class="num">Valor</th></tr></thead><tbody><tr><td>Resmas de papel carta</td><td class="num">380.000</td></tr><tr><td>IVA 19 %</td><td class="num">72.200</td></tr><tr><td>Retención en la fuente 2,5 %</td><td class="num">−9.500</td></tr></tbody></table>
  </div>
  <footer class="modal__footer"><button type="button" class="btn btn--peligro-contorno" style="margin-right:auto">Anular</button><button type="button" class="btn btn--close">Cerrar</button></footer>
</div></app-compras>`;

// Estados de la ✕ y de «Cancelar» (los hovers se fuerzan con .es-hover).
const ESTADOS = `<div class="estados">
  <figure><figcaption>✕ en reposo</figcaption><app-facturacion><div class="modal modal--estatico" style="width:300px">${head({ titulo: 'Factura FE1027' })}</div></app-facturacion></figure>
  <figure><figcaption>✕ con el puntero</figcaption><app-facturacion><div class="modal modal--estatico" style="width:300px"><header class="modal__head"><div><h3 class="modal__title">Factura FE1027</h3></div><button class="icon-action es-hover" aria-label="Cerrar">${X}</button></header></div></app-facturacion></figure>
  <figure><figcaption>✕ deshabilitada (emitiendo ante la DIAN)</figcaption><app-facturacion><div class="modal modal--estatico" style="width:300px"><header class="modal__head"><div><h3 class="modal__title">Factura FE1027</h3></div><button class="icon-action" aria-label="Cerrar" disabled>${X}</button></header></div></app-facturacion></figure>
  <figure><figcaption>«Cancelar»: reposo · con el puntero · y el primario deshabilitado (como hoy)</figcaption><div class="modal modal--estatico" style="width:420px"><footer class="modal__footer"><button class="btn btn--close">Cancelar</button><button class="btn btn--close es-hover">Cancelar</button><button class="btn btn--primary" disabled>Guardar</button></footer></div></figure>
</div>`;

// Cabeceras sueltas: los otros casos de los 64 modales.
const SUELTAS = `
<div class="sueltas">
  <figure><figcaption>Subtítulo largo (dos líneas a 640 px) · «Liquidar nómina»</figcaption>
    <app-nomina><div class="modal modal--estatico" style="width:640px">${head({ titulo: 'Liquidar nómina', sub: 'Escriba las novedades del mes; el sistema liquida a la derecha. Se guarda como borrador: no sale a la DIAN hasta que se emita.' })}<div class="modal__body modal__body--corto"></div></div></app-nomina></figure>
  <figure><figcaption>Pastilla en las acciones de cabecera · «Tercero» (también Compras y Comprobantes)</figcaption>
    <app-terceros><div class="modal modal--estatico" style="width:640px">${head({ titulo: 'Industrias del Valle S.A.S.', sub: '<span class="mono">NIT 900.123.456-7</span>', acciones: '<span class="pill pill--success">Activo</span>' })}<div class="modal__body modal__body--corto"></div></div></app-terceros></figure>
  <figure><figcaption>Sin ✕ · «Enviar el desprendible» (confirmación pequeña)</figcaption>
    <app-nomina><div class="modal modal--sm modal--estatico" style="width:480px">${head({ titulo: 'Enviar el desprendible', sub: 'Laura Martínez · noviembre de 2026', x: false })}<div class="modal__body modal__body--corto"></div></div></app-nomina></figure>
  <figure><figcaption>Pastilla de estado de OS en el título (mayúsculas)</figcaption>
    <app-validation><div class="modal modal--estatico" style="width:640px">${head({ titulo: 'Cobro de la orden', pill: '<span class="pill pill--info">PROGRAMADA</span>', sub: 'OS-2026-0412 · BOLÍVAR' })}<div class="modal__body modal__body--corto"></div></div></app-validation></figure>
  <figure class="solo-d"><figcaption>Descartado: modal--sm CON disco · «Enviar la factura»</figcaption>
    <app-facturacion><div class="modal modal--sm con-disco modal--estatico" style="width:480px">${head({ titulo: 'Enviar la factura al cliente', sub: 'FE1027 · Compañía de Seguros Bolívar S.A.' })}<div class="modal__body modal__body--corto"></div></div></app-facturacion></figure>
</div>`;

const PAGINA = (titulo, menuOn) => `<div class="fp" aria-hidden="true"><div class="fp__menu"><div class="fp__logo"></div>${['Inicio', 'Órdenes', 'Facturación', 'Cartera', 'Nómina', 'Terceros'].map((m) => `<div class="fp__item${m === menuOn ? ' fp__item--on' : ''}">${m}</div>`).join('')}</div><div class="fp__main"><div class="fp__barra"></div><div class="fp__cont"><div class="fp__titulo">${titulo}</div><div class="fp__tabla">${Array.from({ length: 9 }, (_, i) => `<div class="fp__fila"><span>${i ? 'Fila ' + i : 'Columna'}</span><span>${i ? '—' : 'Columna'}</span><span>${i ? '—' : 'Columna'}</span></div>`).join('')}</div></div></div></div>`;

const escena = (id, cls, pag, menu, modal) => `<div class="escena ${cls}" id="${id}">${PAGINA(pag, menu)}${modal}</div>`;

const VARIANTES = [
  { k: 'antes', cls: 'v-antes', nombre: 'ANTES · el modal de hoy', css: '',
    desc: 'Réplica fiel de <code>styles.scss</code>: cabecera blanca sobre cuerpo blanco con una línea de 1 px, título 17/600, subtítulo 13 en tinta-3, ✕ de 32 px con ícono de 16. En el pie, «Cancelar» en rojo tenue (<code>--close</code>) y el primario deshabilitado en gris.' },
  { k: 'a', cls: 'v-a', nombre: 'A · Franja en cielo', css: CSS_A('.v-a'),
    desc: 'La cabecera pasa a <code>--cielo</code>, el mismo plano de la franja del saludo del Inicio: el modal se lee en dos planos sin añadir color nuevo. Título 20/600, subtítulo en tinta-2, ✕ de 36 px con ícono de 20. Las pastillas de la franja van sobre blanco con contorno de su tono. Pie: «Cancelar» pasa a secundario (contorno) y el primario deshabilitado conserva su forma en cielo (azul muy claro) en vez de gris.' },
  { k: 'b', cls: 'v-b', nombre: 'B · Disco del tema', css: CSS_B('.v-b'),
    desc: 'La cabecera sigue blanca, pero abre con el disco de 44 px del módulo (los mismos dibujos de los accesos del Inicio: sombra plana cian, trazo en acción). El ícono lo pone la hoja global según el componente que abre el modal (<code>app-nomina</code>, <code>app-facturacion</code>…): cero HTML. Título 19/600, subtítulo en tinta-2. Pie: «Cancelar» solo texto en tinta-2 (lo más callado posible) y primario deshabilitado en cielo.' },
  { k: 'c', cls: 'v-c', nombre: 'C · Cabecera en noche', css: CSS_C('.v-c'),
    desc: 'La cabecera va en <code>--noche</code>, el ancla de marca de la barra lateral, el login y el toast: título blanco 18/600, subtítulo en texto-noche, ✕ en ícono-noche con foco cian. Es la separación más fuerte posible. Los botones de cabecera pasan a contorno claro. Pie como en A.' },
  { k: 'd', cls: 'v-d', nombre: 'D · Franja en cielo + disco del tema', css: '',
    desc: 'La franja <code>--cielo</code> de A con el disco del módulo de B. Sobre cielo, un disco cielo desaparece: aquí el disco es <b>blanco</b> (el plano del cuerpo asoma en la franja) con la <b>sombra plana cian</b> de 2 px de los accesos del Inicio y de las acciones de fila. El ícono lo pone el componente que abre el modal (20 mapeados); uno sin mapear no pinta disco. <b>Sin disco</b> en <code>modal--sm</code> (confirmaciones) y en <code>modal--sobre</code> (alta rápida encima de otro modal): ahí la franja basta (al final, el sm con disco, descartado). ✕, botones, pastillas y pie, como en A.' },
];

const seccion = (v) => `
<section class="var ${v.cls}" id="${v.k}">
  <header class="var__cab"><h2>${v.nombre}</h2><p>${v.desc}</p></header>
  <h3 class="sub">Nómina · «Nuevo empleado» (880 px, primario deshabilitado porque falta la persona)</h3>
  ${escena(`${v.k}-empleado`, 'escena--ancha', 'Nómina', 'Nómina', M_EMPLEADO)}
  <h3 class="sub">Órdenes · «Detalle de la orden» (acciones en la cabecera, estado en el pie)</h3>
  ${escena(`${v.k}-orden`, 'escena--ancha', 'Órdenes', 'Órdenes', M_ORDEN)}
  <h3 class="sub">Facturación · detalle de factura (pastilla de estado en el título, pie cargado)</h3>
  ${escena(`${v.k}-factura`, 'escena--ancha', 'Facturación', 'Facturación', M_FACTURA)}
  <div class="fila">
    <div><h3 class="sub">Modal pequeño (480 px) · «Enviar la factura»</h3>${escena(`${v.k}-sm`, 'escena--media', 'Facturación', 'Facturación', M_ENVIAR)}</div>
    <div><h3 class="sub">Celular 390 px · «Nuevo empleado»</h3>${escena(`${v.k}-movil-empleado`, 'movil', 'Nómina', 'Nómina', M_EMPLEADO)}</div>
    <div><h3 class="sub">Celular 390 px · factura</h3>${escena(`${v.k}-movil-factura`, 'movil', 'Facturación', 'Facturación', M_FACTURA)}</div>
  </div>
  <h3 class="sub">Modal sobre modal · alta rápida de cliente encima de «Nueva factura manual»</h3>
  ${escena(`${v.k}-sobre`, 'escena--ancha', 'Facturación', 'Facturación', M_SOBRE)}
  <h3 class="sub">Compras · subtítulo con clase propia (<code>.cp-sub</code>, tinta-3 encapsulada) y pastilla en las acciones de cabecera</h3>
  ${escena(`${v.k}-compra`, 'escena--ancha', 'Compras', 'Facturación', M_COMPRA)}
  <h3 class="sub">Estados de la ✕ y de «Cancelar»</h3>
  <div class="velo-plano" id="${v.k}-estados">${ESTADOS}</div>
  <h3 class="sub">Los otros casos de los 64 modales</h3>
  <div class="velo-plano" id="${v.k}-sueltas">${SUELTAS}</div>
</section>`;

// Solo para enseñar en la lámina el modal--sm CON disco (descartado).
const LAMINA_SOLO_D = `.v-d .modal--sm.con-disco > .modal__head{padding-left:20px}.v-d .modal--sm.con-disco > .modal__head > div{align-self:center}
.v-d .modal--sm.con-disco > .modal__head::before{content:'';flex:none;align-self:center;width:44px;height:44px;border-radius:50%;background:var(--superficie) var(--icono-modal) center/30px no-repeat;box-shadow:2px 2px 0 var(--ico-tinte)}`;
const LAMINA_CSS = `
.lamina{max-width:1400px;margin:0 auto;padding:40px 20px 80px}
.lamina>header h1{font-size:28px;font-weight:600;letter-spacing:-.02em}
.lamina>header p{max-width:90ch;color:var(--tinta-2);margin-top:8px}
.indice{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0}
.indice a{padding:6px 12px;border:1px solid var(--borde-control);border-radius:999px;color:var(--accion);text-decoration:none;font-weight:500;background:#fff}
.var{margin-top:56px;padding-top:28px;border-top:1px solid var(--borde)}
.var__cab h2{font-size:24px;font-weight:600;letter-spacing:-.02em}
.var__cab p{max-width:110ch;margin-top:6px;color:var(--tinta-2)}
.sub{font-size:14px;font-weight:600;color:var(--tinta-2);margin:26px 0 10px}
.fila{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.velo-plano{background:#7a8693;border-radius:10px;padding:24px}
.sueltas{display:grid;grid-template-columns:repeat(2,max-content);gap:24px}
.sueltas figure{margin:0}
.solo-d{display:none}.v-d .solo-d{display:block}
.estados{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}.estados figure{margin:0}.estados figcaption{font-size:12px;font-weight:600;color:#fff;margin-bottom:8px}
.sueltas figcaption{font-size:12px;font-weight:600;color:#fff;margin-bottom:8px}
.modal--estatico{position:relative;top:auto;left:auto;transform:none;max-width:100%}
.modal__body--corto{min-height:56px}
.tabla-cx{width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid var(--borde);border-radius:10px;overflow:hidden}
.tabla-cx th{background:var(--cabecera-tabla);text-align:left;padding:8px 10px;font-size:12px;color:var(--tinta-2);border-bottom:1px solid var(--borde)}
.tabla-cx td{padding:7px 10px;border-bottom:1px solid var(--borde);vertical-align:middle}
.tabla-cx code{font-size:12px}
.mu{display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid rgb(15 42 68 / 20%);vertical-align:-2px;margin-right:6px}
.cx{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.cx--ok{background:var(--ok-fondo);color:var(--ok)}.cx--no{background:var(--error-fondo);color:var(--error)}.cx--deco{background:var(--hundida);color:var(--tinta-2)}
.comparar{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid var(--borde)}
.comparar th,.comparar td{padding:10px 12px;border-bottom:1px solid var(--borde);text-align:left;vertical-align:top}
.comparar th{background:var(--cabecera-tabla);font-size:12px;color:var(--tinta-2)}
`;

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cabeceras de modal</title>
<style>${CSS_BASE}${LAMINA_CSS}${CSS_A('.v-a')}${CSS_B('.v-b')}${CSS_C('.v-c')}${CSS_D('.v-d')}${LAMINA_SOLO_D}</style></head>
<body><main class="lamina">
<header>
  <h1>Cabeceras y pies de los modales · lámina para elegir</h1>
  <p>Pedido del dueño: «los header de los modales no se notan mucho». Hoy la cabecera es blanca sobre cuerpo blanco, el título 17/600 compite con las etiquetas de los campos y la ✕ es pequeña; en el pie, «Cancelar» en rojo tenue se lleva la vista y el primario deshabilitado no se reconoce. Abajo, el modal actual y tres propuestas aplicadas a los mismos cuatro modales, a tamaño real, sobre la página oscurecida. Las tres salen solo de <code>styles.scss</code>: ninguno de los 64 modales cambia su HTML.</p>
  <nav class="indice"><a href="#antes">Antes</a><a href="#a">A · Franja en cielo</a><a href="#b">B · Disco del tema</a><a href="#c">C · Cabecera en noche</a><a href="#d">D · Franja + disco</a><a href="#comparar">Comparación</a><a href="#contraste">Contrastes</a></nav>
</header>
${VARIANTES.map(seccion).join('\n')}
<section class="var" id="comparar"><header class="var__cab"><h2>Comparación</h2></header>
<table class="comparar" style="margin-top:16px"><thead><tr><th></th><th>A · Franja en cielo</th><th>B · Disco del tema</th><th>C · Cabecera en noche</th><th>D · Franja + disco</th></tr></thead><tbody>
<tr><th>Cuánto se nota</th><td>Claramente, sin gritar: dos planos.</td><td>Por el disco; la cabecera sigue blanca.</td><td>Máximo: bloque oscuro.</td><td>Como A, más un ancla de módulo a la izquierda.</td></tr>
<tr><th>Regla del DESIGN que cambia</th><td>§7 Modal «cabecera blanca» → «cabecera en cielo».</td><td>§7 Modal y §10 (círculos solo en el Inicio y en las filas) → añadir «y la cabecera del modal».</td><td>§7 Modal «cabecera blanca» → «en noche»; §1.2 noche deja de ser solo ancla de barra/login/toast.</td><td>Lo de A (§3, §7 Modal, Botón y Pastilla) más §10: círculos también en la cabecera del modal (no en sm ni sobre).</td></tr>
<tr><th>HTML a tocar</th><td>0 de 64</td><td>0 de 64 (un ícono por módulo, por el selector del componente)</td><td>0 de 64; 4 hojas de página con color propio en el subtítulo necesitan una regla de refuerzo</td><td>0 de 64; un mapa de 20 componentes → ícono en styles.scss</td></tr>
<tr><th>Riesgo</th><td>Bajo: pastillas en la franja necesitan el fondo blanco.</td><td>Medio: el ícono es por módulo, no por modal («Enviar la factura» muestra la factura).</td><td>Medio-alto: pesa en las confirmaciones pequeñas y en modal sobre modal; los subtítulos con color de página quedan ilegibles si se olvida el refuerzo.</td><td>Bajo-medio: el ícono es por módulo; un componente nuevo con modal sale sin disco hasta mapearlo; 20 SVG en data URI duplican los de dashboard.ts.</td></tr>
</tbody></table></section>
<section class="var" id="contraste"><header class="var__cab"><h2>Contrastes medidos (WCAG 2.x)</h2><p>Calculados por <code>construir.mjs</code> con los valores de <code>_tokens.scss</code>. Texto: 4,5:1. Íconos y contornos que son el único indicio: 3:1.</p></header>
<table class="tabla-cx" style="margin-top:16px"><thead><tr><th>Variante</th><th>Qué</th><th>Primer plano</th><th>Fondo</th><th>Contraste</th><th>Umbral</th><th>Nota</th></tr></thead><tbody>${tablaContraste}</tbody></table></section>
</main></body></html>`;

fs.writeFileSync(path.join(AQUI, 'lamina.html'), html);
console.log('lamina.html', (html.length / 1024).toFixed(0), 'KB');
console.log(filas.map(([v, q, a, b]) => `${v} | ${q} | ${ratio(a, b).toFixed(2)}`).join('\n'));

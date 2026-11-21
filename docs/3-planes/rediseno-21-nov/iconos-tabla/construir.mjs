// Construye iconos.ts y lamina.html desde fuente.mjs (ronda 3 · opción F).
// Uso: node construir.mjs <ruta-repo-frontend>
import fs from 'node:fs';
import path from 'node:path';
import { ICONOS, ANTES } from './fuente.mjs';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const REPO = process.argv[2];

// ------------------------------------------------------------------ iconos.ts
{
  const lineas = Object.entries(ICONOS).map(([n, i]) => {
    const campos = [`nivel: '${i.nivel}'`, `tono: '${i.tono}'`];
    for (const k of ['sombra', 'forma', 'tapa', 'trazos', 'acento']) if (i[k]) campos.push(`${k}: '${i[k]}'`);
    for (const k of ['relleno', 'halo', 'estado', 'apagado', 'reserva']) if (i[k]) campos.push(`${k}: true`);
    if (i.disco === false || i.nivel === 'utilitario') campos.push('disco: false');
    if (i.grosor) campos.push(`grosor: ${i.grosor}`);
    if (i.grosorAcento) campos.push(`grosorAcento: ${i.grosorAcento}`);
    return `  /** ${i.etiqueta} */\n  '${n}': { ${campos.join(', ')} },`;
  });
  const ts = `/**
 * ORBITA · Íconos de las ACCIONES DE FILA (ronda 3, opción F · 21-nov-2026).
 * Generado desde scratchpad/iconos/fuente.mjs. En la fase 2 vive en
 * src/app/shared/icono/iconos-accion.ts y lo pinta la directiva-componente
 * \`svg[appIcono]\` (el propio <svg> del botón; ver plan-integracion.md §1).
 *
 * Todos comparten VIEWBOX_ACCION (retícula 18) y se pintan a 20 px dentro de
 * un disco de 28 px. Capas, de abajo arriba (las del Inicio):
 *  - sombra : la silueta (forma + tapa, o \`sombra\` si no hay forma) desplazada
 *             1,8 unidades = 2 px, en --ico-tinte (cian 58 %). SIEMPRE visible.
 *  - forma / tapa : silueta cerrada, cuerpo --ico-relleno (blanco), trazo currentColor (--accion).
 *  - trazos : detalle en currentColor.
 *  - halo   : si \`halo\`, el acento lleva debajo un trazo ancho del color del cuerpo.
 *  - acento : lo que HACE la acción, en --ico-acento (--cian-trazo-fuerte, ≥3:1).
 *             \`relleno\` lo rellena; \`estado\` lo mantiene en cian aunque el tono
 *             lo apague; \`apagado\` lo pinta en --tinta-inactiva.
 * tono  : ver | normal | peligro (irreversible: hover rojo) | reversible (hover ámbar) | ok.
 *         Lo fija el catálogo, NO la plantilla (plan §1.3).
 * disco : false → sin disco en reposo (utilitarios y «quitar» de líneas editables).
 */
export const VIEWBOX_ACCION = '0 0 18 18';

export type NivelIcono = 'fila' | 'utilitario';
export type TonoAccion = 'normal' | 'ver' | 'peligro' | 'reversible' | 'ok';

export interface DefIconoAccion {
  nivel: NivelIcono;
  tono: TonoAccion;
  sombra?: string;
  forma?: string;
  tapa?: string;
  trazos?: string;
  acento?: string;
  relleno?: true;
  halo?: true;
  estado?: true;
  apagado?: true;
  disco?: false;
  /** Grosor propio (los puntos de «más»). */
  grosor?: number;
  /** Grosor propio del acento (la barra de la cuenta T). */
  grosorAcento?: number;
  /** Dibujado por adelantado: aún no hay botón de tabla que lo use. */
  reserva?: true;
}

export const ICONOS_ACCION = {
${lineas.join('\n')}
} as const satisfies Record<string, DefIconoAccion>;

export type NombreIconoAccion = keyof typeof ICONOS_ACCION;
`;
  fs.writeFileSync(path.join(AQUI, 'iconos.ts'), ts);
}

// ------------------------------------------------------------------ dibujo
function svgDespues(n, cls = 'ico') {
  const i = ICONOS[n];
  if (!i) throw new Error('sin ícono ' + n);
  const p = [];
  const siluetas = i.sombra ? [i.sombra] : [i.forma, i.tapa].filter(Boolean);
  for (const d of siluetas) p.push(`<path class="ico__sombra" d="${d}"/>`);
  for (const k of ['forma', 'tapa']) if (i[k]) p.push(`<path class="ico__forma" d="${i[k]}"/>`);
  if (i.trazos) p.push(`<path class="ico__trazo" d="${i.trazos}"${i.grosor ? ` style="stroke-width:${i.grosor}"` : ''}/>`);
  if (i.acento && i.halo) p.push(`<path class="ico__halo" d="${i.acento}"/>`);
  if (i.acento) {
    const c = ['ico__acento', i.relleno ? 'ico__acento--relleno' : '', i.estado ? 'ico__acento--estado' : '', i.apagado ? 'ico__acento--apagado' : ''].filter(Boolean).join(' ');
    p.push(`<path class="${c}" d="${i.acento}"${i.grosorAcento ? ` style="stroke-width:${i.grosorAcento}"` : ''}/>`);
  }
  return `<svg class="${cls}${i.nivel === 'utilitario' ? ' ico--util' : ''}" viewBox="0 0 18 18" aria-hidden="true">${p.join('')}</svg>`;
}
function svgAntes(n, v = 0, cls = '') {
  const a = ANTES[n];
  if (!a) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a[v] ?? a[0]}</svg>`;
}
// Clase que lleva HOY cada acción (styles.scss:1422-1458 y cada plantilla).
const CLASE_ANTES = { ver: 'icon-action--ver', eliminar: 'icon-action--danger', archivar: 'icon-action--danger', restaurar: 'icon-action--on' };
function btnAntes(a) {
  if (a === 'hueco') return '<span class="icon-action icon-action--hueco"></span>';
  if (a.texto) return `<button type="button" class="btn btn--ghost btn--sm ${a.estado || ''}">${a.texto}</button>`;
  const cls = ['icon-action', a.claseAntes ?? CLASE_ANTES[a.n] ?? '', a.estado || ''].join(' ');
  return `<button type="button" class="${cls}" ${a.estado === 'is-disabled' ? 'disabled' : ''} title="${a.l || ''}">${svgAntes(a.nAntes || a.n, a.v || 0)}</button>`;
}
const sinDisco = (i) => i.disco === false || i.nivel === 'utilitario';
function btnDespues(a) {
  if (a === 'hueco') return '<span class="accion accion--hueco"></span>';
  const i = ICONOS[a.n];
  const cls = ['accion', i.tono !== 'normal' ? 'accion--' + i.tono : '', sinDisco(i) ? 'accion--sin-disco' : '', a.estado || ''].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" ${a.estado === 'is-disabled' ? 'disabled' : ''} title="${a.l || i.etiqueta}">${svgDespues(a.n)}</button>`;
}

// ------------------------------------------------------------------ tablas reales
const P = (t, c) => `<span class="pill pill--${c}">${t}</span>`;
const VISTAS = [
  {
    id: 'ordenes', titulo: 'Órdenes', ruta: 'validation.html:341-433', nota: 'Tres ranuras fijas más Deshabilitar. La tercera cambia según el estado: asignar, reprogramar o soportes. Deshabilitar deja de ser una papelera: pasa a «archivar», que se puede deshacer, con hover en ámbar.',
    cols: ['Orden', 'Empresa · ARL', 'Estado', 'Vencimiento', 'Opciones'],
    filas: [
      { c: ['<b>OS-2026-0312</b><small>1390041_26</small>', 'TRANSPORTES DEL SUR SAS<small>Bolívar</small>', P('Sin programar', 'warning'), '28/11/2026'], a: [{ n: 'ver' }, { n: 'editar' }, { n: 'asignar' }, { n: 'archivar' }] },
      { c: ['<b>OS-2026-0309</b><small>AXA-77120</small>', 'CLÍNICA SANTA ANA<small>AXA Colpatria</small>', P('Programada', 'info'), '02/12/2026'], a: [{ n: 'ver' }, { n: 'editar', estado: 'is-focus' }, { n: 'reprogramar' }, { n: 'archivar' }] },
      { row: 'is-row-hover', c: ['<b>OS-2026-0301</b><small>COL-4410</small>', 'ALIMENTOS EL VALLE<small>Colmena</small>', P('Ejecutada', 'success'), '20/11/2026'], a: [{ n: 'ver' }, { n: 'editar' }, { n: 'soportes', estado: 'is-hover' }, { n: 'archivar' }] },
      { row: 'is-row-hover', c: ['<b>OS-2026-0298</b><small>1389117_26</small>', 'CONSTRUCTORA ANDINA LTDA<small>Bolívar</small>', P('Programada', 'info'), '05/12/2026'], a: [{ n: 'ver' }, { n: 'editar' }, { n: 'reprogramar' }, { n: 'archivar', estado: 'is-hover' }] },
      { c: ['<b>OS-2026-0288</b><small>1388210_26</small>', 'FERRETERÍA LA 14<small>Bolívar</small>', P('Deshabilitada', 'muted'), '—'], a: [{ n: 'restaurar' }, { n: 'eliminar', estado: 'is-hover', l: 'Eliminar definitivamente' }] },
    ],
  },
  {
    id: 'facturacion', titulo: 'Facturación › Emitidas', ruta: 'facturacion.html:280-299', nota: 'La fila con más acciones del sistema: cinco ranuras. Las que no aplican se reservan como hueco, para que el ojo no cambie de sitio.',
    cols: ['Número', 'Cliente', 'Emisión', 'Total a pagar', 'Estado', 'Acciones'],
    filas: [
      { row: 'is-row-hover', c: ['<b>FE-1027</b>', 'COMPAÑÍA DE SEGUROS BOLÍVAR S A', '18/11/2026', '<span class="num">$ 1.995.216</span>', P('Validada', 'success')], a: [{ n: 'ver' }, { n: 'documento' }, { n: 'enviar', estado: 'is-hover' }, { n: 'contabilizacion' }, { n: 'historial' }] },
      { c: ['<b>NC-93</b>', 'AXA COLPATRIA SEGUROS DE VIDA SA', '12/11/2026', '<span class="num">$ 186.974</span>', P('Validada', 'success')], a: [{ n: 'ver' }, { n: 'documento' }, { n: 'enviar' }, { n: 'contabilizacion', estado: 'is-focus' }, { n: 'historial' }] },
      { c: ['<b>FE-1019</b>', 'CONSTRUCTORA ANDINA LTDA', '02/11/2026', '<span class="num">$ 640.500</span>', P('Anulada', 'muted')], a: [{ n: 'ver' }, { n: 'documento' }, 'hueco', { n: 'contabilizacion' }, { n: 'historial' }] },
      { c: ['<b>FE-1031</b>', 'COLMENA SEGUROS', '20/11/2026', '<span class="num">$ 512.000</span>', P('Rechazada', 'danger')], a: [{ n: 'ver' }, 'hueco', 'hueco', 'hueco', { n: 'historial' }] },
    ],
  },
  {
    id: 'ds', titulo: 'Documentos soporte', ruta: 'documentos-soporte.html:216-228',
    cols: ['Número', 'Proveedor', 'Fecha', 'Total', 'Estado', 'Acciones'],
    filas: [
      { c: ['<b>DS-1334</b>', 'ESTEFANY CANCHALA', '15/11/2026', '<span class="num">$ 1.250.000</span>', P('Validado', 'success')], a: [{ n: 'ver' }, { n: 'documento' }, { n: 'contabilizacion' }, { n: 'historial' }] },
      { row: 'is-row-hover', c: ['<b>DS-1333</b>', 'JOSÉ LUIS GUACAS', '15/11/2026', '<span class="num">$ 980.000</span>', P('Validado', 'success')], a: [{ n: 'ver', estado: 'is-hover' }, { n: 'documento' }, { n: 'contabilizacion' }, { n: 'historial' }] },
    ],
  },
  {
    id: 'cuentas', titulo: 'Cuentas de cobro', ruta: 'billing.html:162-216', nota: 'La primera fila llega DESTACADA desde la campanita (<code>.fila--destacada</code>, fondo <code>--accion-tenue</code>). «Generar» está deshabilitado porque la cuenta tiene órdenes sin tarifa; la razón va en el title.',
    cols: ['Profesional', 'Mes', 'Órdenes', 'Total', 'Estado', 'Acciones'],
    filas: [
      { row: 'fila--destacada', c: ['DANNY ROSERO', 'Octubre', '6', '<span class="num">$ 2.340.000</span>', P('Enviada', 'info')], a: [{ n: 'ver' }, { n: 'documento' }, 'hueco', { n: 'enviar', v: 1, l: 'Reenviar al profesional' }] },
      { c: ['ESTEFANY CANCHALA', 'Noviembre', '3', '<span class="num">$ 1.120.000</span>', P('Por generar', 'muted')], a: ['hueco', 'hueco', { n: 'generar', estado: 'is-disabled', l: 'Hay órdenes sin tarifa' }, 'hueco'] },
    ],
  },
  {
    id: 'nomina', titulo: 'Nómina › Empleados', ruta: 'nomina.html:129-134', nota: 'Hoy son botones de texto («Editar», «Desactivar»): es la única tabla de registros sin íconos. Pasa a la familia.',
    cols: ['Empleado', 'Documento', 'Salario', 'Estado', 'Acciones'],
    filas: [
      { c: ['LORENA PATIÑO', 'CC 1.085.311.204', '<span class="num">$ 2.100.000</span>', P('Activo', 'success')], a: [{ n: 'editar' }, { n: 'desactivar' }], antes: [{ texto: 'Editar' }, { texto: 'Desactivar' }] },
      { row: 'is-row-hover', c: ['ANDRÉS MORA', 'CC 98.402.117', '<span class="num">$ 1.423.500</span>', P('Inactivo', 'muted')], a: [{ n: 'editar' }, { n: 'activar', estado: 'is-hover' }], antes: [{ texto: 'Editar' }, { texto: 'Activar', estado: 'is-hover' }] },
    ],
  },
  {
    id: 'cartera', titulo: 'Cartera', ruta: 'cartera.html:81',
    cols: ['Cliente', 'Documentos', 'Saldo', 'Vencido', 'Acciones'],
    filas: [
      { row: 'is-row-hover', c: ['COMPAÑÍA DE SEGUROS BOLÍVAR S A', '4', '<span class="num">$ 1.995.216</span>', '<span class="err">todo vencido</span>'], a: [{ n: 'ver', v: 1 }] },
      { c: ['AXA COLPATRIA SEGUROS DE VIDA SA', '1', '<span class="num">$ 186.974</span>', '<span class="err">todo vencido</span>'], a: [{ n: 'ver', v: 1, estado: 'is-focus' }] },
    ],
  },
  {
    id: 'terceros', titulo: 'Terceros', ruta: 'terceros.html:109-130', nota: 'Hoy solo esta vista pinta el estado «encendido» en verde (terceros.scss:499). El interruptor lo unifica: perilla cian = activo.',
    cols: ['Nombre', 'Identificación', 'Tipo', 'Estado', 'Acciones'],
    filas: [
      { row: 'is-row-hover', c: ['CLÍNICA SANTA ANA', 'NIT 900.412.773-1', 'Cliente', P('Activo', 'success')], a: [{ n: 'ver', v: 1 }, { n: 'editar' }, { n: 'desactivar', estado: 'is-hover', claseAntes: 'icon-action--on' }] },
      { c: ['PAPELERÍA CENTRAL', 'NIT 800.155.920-4', 'Proveedor', P('Inactivo', 'muted')], a: [{ n: 'ver', v: 1 }, { n: 'editar' }, { n: 'activar' }] },
    ],
  },
  {
    id: 'profesionales', titulo: 'Profesionales', ruta: 'professionals.html:143-170',
    cols: ['Profesional', 'Registro ARL', 'Desempeño', 'Estado', 'Acciones'],
    filas: [
      { row: 'is-row-hover', c: ['JOSÉ LUIS GUACAS<small>Ingeniero SST</small>', 'Bolívar · AXA', '★ 4,8 <small>(12)</small>', P('Activo', 'success')], a: [{ n: 'editar' }, { n: 'registro-arl', estado: 'is-hover' }, { n: 'desactivar' }] },
      { c: ['DANNY ROSERO<small>Fisioterapeuta</small>', 'Colmena', '★ 4,5 <small>(7)</small>', P('Activo', 'success')], a: [{ n: 'editar' }, { n: 'registro-arl' }, { n: 'desactivar' }] },
    ],
  },
  {
    id: 'configuracion', titulo: 'Configuración › Usuarios', ruta: 'settings.html:574-614',
    cols: ['Usuario', 'Rol', 'Último acceso', 'Estado', 'Acciones'],
    filas: [
      { c: ['ADMINISTRADOR MAESTRO JD&D<small>maestro@jdd.co</small>', 'Administrador maestro', 'Hoy 8:33 p. m.', P('Activo', 'success')], a: [{ n: 'editar' }, 'hueco', 'hueco'] },
      { row: 'is-row-hover', c: ['LORENA PATIÑO<small>contabilidad@jdd.co</small>', 'Contador', 'Ayer', P('Activo', 'success')], a: [{ n: 'editar' }, { n: 'desactivar' }, { n: 'eliminar', estado: 'is-hover', claseAntes: 'icon-action--danger' }] },
    ],
  },
  {
    id: 'contabilidad', titulo: 'Contabilidad › Plan de cuentas', ruta: 'contabilidad.html:181-210', nota: 'Hoy «Inactivar» es un círculo tachado aquí y un botón de encendido en las demás vistas.',
    cols: ['Código', 'Cuenta', 'Naturaleza', 'Estado', 'Acciones'],
    filas: [
      { c: ['<b>1105</b>', 'Caja', 'Débito', P('Activa', 'success')], a: [{ n: 'subcuenta' }, { n: 'editar' }, 'hueco', { n: 'desactivar', v: 1 }] },
      { row: 'is-row-hover', c: ['<b>110505</b>', 'Caja general', 'Débito', P('Activa', 'success')], a: [{ n: 'subcuenta', estado: 'is-hover' }, { n: 'editar' }, { n: 'eliminar', v: 3, claseAntes: '' }, { n: 'desactivar', v: 1 }] },
    ],
  },
];

function tabla(v, version) {
  const filas = v.filas.map((f) => {
    const lista = version === 'antes' ? (f.antes || f.a) : f.a;
    const acc = lista.map(version === 'antes' ? btnAntes : btnDespues).join('');
    return `<tr class="${f.row || ''}">${f.c.map((c) => `<td>${c}</td>`).join('')}<td class="col-actions"><div class="row-actions">${acc}</div></td></tr>`;
  }).join('');
  return `<table class="table"><thead><tr>${v.cols.map((c, i) => `<th${i === v.cols.length - 1 ? ' class="col-actions"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>`;
}

// ------------------------------------------------------------------ catálogo
const GRUPOS = [
  ['Consultar', ['ver', 'documento', 'contabilizacion', 'historial', 'soportes', 'registro-arl']],
  ['Modificar y despachar', ['editar', 'generar', 'enviar', 'asignar', 'reprogramar', 'subcuenta', 'cuadrar', 'guardar', 'copiar']],
  ['Estado del registro', ['desactivar', 'activar', 'archivar', 'restaurar', 'eliminar', 'quitar']],
  ['Reserva (dibujados por adelantado)', ['descargar', 'subir-archivo', 'aprobar', 'anular', 'duplicar', 'cobro', 'mas']],
  ['Utilitarios (sin disco en reposo)', ['cerrar', 'anterior', 'siguiente', 'subir', 'bajar']],
];
function zoomCls(i) {
  if (sinDisco(i)) return 'zoom-disco zoom4--sin';
  if (i.tono === 'ver') return 'zoom-disco zoom4--ver';
  if (i.tono === 'peligro' || i.tono === 'reversible') return 'zoom-disco zoom4--neutro';
  return 'zoom-disco';
}
function tarjeta(n) {
  const i = ICONOS[n];
  const nv = ANTES[n]?.length || 0;
  return `<figure class="cat">
    <figcaption><code>${n}</code><span>${i.etiqueta}</span>${i.tono !== 'normal' ? `<em class="tono tono--${i.tono}">${i.tono}</em>` : ''}</figcaption>
    <div class="cat__fila">
      <div class="cat__lado">
        <span class="lbl">antes</span>
        ${ANTES[n] ? `<span class="cat__real">${btnAntes({ n })}</span><span class="zoom4 rejilla24">${svgAntes(n, 0, 'z')}</span>${nv > 1 ? `<span class="var">+${nv - 1} variante${nv > 2 ? 's' : ''}</span>` : ''}` : '<span class="nuevo">nuevo</span>'}
      </div>
      <div class="cat__lado">
        <span class="lbl">después · reposo · fila en hover · hover</span>
        <span class="cat__real">${btnDespues({ n })}</span><span class="cat__real cat__real--fila">${btnDespues({ n })}${btnDespues({ n, estado: 'is-hover' })}</span>
        <span class="zoom4 rejilla18 ${zoomCls(i)}">${svgDespues(n, 'ico z')}</span>
      </div>
    </div>
  </figure>`;
}

// ------------------------------------------------------------------ anatomía y estados
const ESTADOS = [['', '', 'reposo'], ['', 'ctx-fila-hover', 'fila en hover'], ['', 'ctx-destacada', 'fila destacada'], ['is-hover', 'ctx-fila-hover', 'hover'], ['is-focus', '', 'foco (teclado)'], ['is-active', 'ctx-fila-hover', 'pulsado'], ['is-disabled', '', 'deshabilitado']];
const FILAS_ESTADO = [['ver', 'Ver · protagonista'], ['editar', 'Normal'], ['eliminar', 'Peligro · irreversible'], ['archivar', 'Reversible'], ['desactivar', 'Reversible · interruptor'], ['aprobar', 'Ok'], ['quitar', 'Quitar línea · sin disco'], ['cerrar', 'Utilitario']];
const tablaEstados = `<table class="estados"><thead><tr><th></th>${ESTADOS.map(([, , e]) => `<th>${e}</th>`).join('')}</tr></thead><tbody>${FILAS_ESTADO.map(([n, t]) => `<tr><th>${t}<code>${n}</code></th>${ESTADOS.map(([c, ctx]) => `<td class="${ctx}"><span class="est1">${btnDespues({ n, estado: c })}</span><span class="est3">${btnDespues({ n, estado: c })}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;

const capas = (n) => {
  const i = ICONOS[n];
  const una = (d, cls, extra = '') => d ? `<svg class="ico z" viewBox="0 0 18 18" style="width:64px;height:64px"><path class="${cls}" d="${d}" ${extra}/></svg>` : '';
  return `<div class="capas">
    <div><span class="zoom8 rejilla18 zoom-disco">${svgDespues(n, 'ico z')}</span><small>Compuesto, en reposo:<br>disco --cielo 28 px, ícono 20 px</small></div>
    <div><span class="zoom4 rejilla18">${una(i.forma, 'ico__sombra', 'style="translate:1.8px 1.8px"')}</span><small>1 · sombra plana<br>silueta +1,8 u = 2 px · cian 58 %</small></div>
    <div><span class="zoom4 rejilla18 sola">${una(i.forma, 'ico__forma')}</span><small>2 · forma<br>cuerpo blanco · trazo --accion</small></div>
    <div><span class="zoom4 rejilla18 sola">${una(i.trazos, 'ico__trazo')}</span><small>3 · trazos<br>--accion</small></div>
    <div><span class="zoom4 rejilla18 sola">${una(i.acento, 'ico__acento')}</span><small>4 · acento, 1,5<br>--cian-trazo-fuerte · lo que HACE</small></div>
  </div>`;
};

// ------------------------------------------------------------------ contrastes medidos
const lum = (h) => { const c = [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const FONDOS = [['Cuerpo blanco / disco en fila hover', '#ffffff'], ['Disco en reposo (--cielo)', '#e9f1f8'], ['Fila en hover (sin disco)', '#ebf0f5'], ['Fila destacada', '#e6eef6'], ['Disco de Ver (ronda 3)', '#ceeaf4'], ['Ver en hover', '#bce2ef'], ['Disco en hover', '#cfe0ee'], ['Hover peligro', '#fdecea'], ['Hover reversible', '#fdf3d2'], ['Hover ok', '#e4f3eb']];
// Dónde aparece cada color: índice de FONDOS en que se pinta de verdad.
const TINTAS = [
  ['Acento --cian-trazo-fuerte (nuevo)', '#157fa6', [0, 1, 2, 3, 4, 5, 6]],
  ['Acento --cian-trazo (ronda 1, se retira aquí)', '#1890bb', [0, 1, 2, 3, 4, 5, 6]],
  ['Trazo --accion', '#13497a', [0, 1, 2, 3, 4, 5, 6]],
  ['Trazo --tinta-2 (peligro/reversible en reposo)', '#44576c', [0, 1, 2, 3]],
  ['Peligro --error', '#b42318', [0, 7]],
  ['Reversible --aviso', '#7a5200', [0, 8]],
  ['Ok --ok', '#13683f', [0, 9]],
  ['Perilla apagada --tinta-inactiva', '#8a96a6', [0]],
];
const tablaContrastes = `<table class="contrastes"><thead><tr><th>Color \\ fondo</th>${FONDOS.map(([f, h]) => `<th><span class="muestra" style="background:${h}"></span>${f}</th>`).join('')}</tr></thead><tbody>${TINTAS.map(([t, h, usa]) => `<tr><td><span class="muestra" style="background:${h}"></span>${t}</td>${FONDOS.map(([, f], k) => { const r = ratio(h, f); return usa.includes(k) ? `<td class="${r < 3 ? 'bajo' : ''}">${r.toFixed(2).replace('.', ',')}</td>` : `<td class="na">—</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;

// ------------------------------------------------------------------ fuentes
const fuente = (w) => {
  const b = fs.readFileSync(path.join(REPO, 'public/fonts', `inter-latin-${w}-normal.woff2`)).toString('base64');
  return `@font-face{font-family:'Inter';font-weight:${w === 600 ? '600 700' : w};font-display:block;src:url(data:font/woff2;base64,${b}) format('woff2')}`;
};

const FILA_MAX = [{ n: 'ver' }, { n: 'documento' }, { n: 'enviar' }, { n: 'contabilizacion' }, { n: 'historial' }];
const css = fs.readFileSync(path.join(AQUI, 'lamina.css'), 'utf8');
const enUso = Object.values(ICONOS).filter((i) => !i.reserva).length;
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Íconos de fila ORBITA</title>
<style>${fuente(400)}${fuente(500)}${fuente(600)}
${css}</style></head>
<body>
<main class="lamina">
<header class="cab" id="cab">
  <div>
    <h1>Íconos de las acciones de tabla</h1>
    <p>Ronda 3 · opción F. Cada acción es un acceso del Inicio en miniatura: disco <code>--cielo</code>, cuerpo blanco con trazo <code>--accion</code>, acento cian y sombra plana siempre visible. ${enUso} significados en uso y ${Object.keys(ICONOS).length - enUso} de reserva. El botón sigue en 28 px, así que la fila no crece.</p>
  </div>
  <div class="cab__ref">
    <span class="ref-circulo"><svg viewBox="0 0 40 40" class="ref-ico"><path class="r-t" transform="translate(3.5 3.5)" d="M9 5h13l7 7v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path class="r-f" d="M9 5h13l7 7v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path class="r-s" d="M22 5v7h7M11.5 22h13M11.5 27h8"/><path class="r-a" d="M11.5 15.5l2.2 2.2 4.3-4.7"/></svg></span>
    <span class="flecha">=</span>
    <span class="ref-mini">${btnDespues({ n: 'documento' })}</span>
    <span class="ref-mini">${btnDespues({ n: 'ver' })}</span>
    <small>Acceso del Inicio (76 px) junto a dos acciones de fila ampliadas al mismo tamaño (28 px × 2,7)</small>
  </div>
</header>

<section id="adn" class="bloque">
  <h2>El ADN del Inicio, a 20 px</h2>
  <div class="adn">
    <div class="reglas">
      <dl>
        <dt>Botón</dt><dd>Disco de 28 px: <code>--cielo</code> en reposo y blanco cuando la fila está en hover o destacada. En táctil, 36 px, pero solo en la columna de acciones. El DESIGN §10 prohibía los «círculos pastel»; el dueño dejó esa regla sin efecto al aprobar el Inicio, y el plan actualiza §7 y §10.</dd>
        <dt>Retícula</dt><dd>18 × 18, pintada a 20 px. Todos los íconos comparten <code>VIEWBOX_ACCION</code>.</dd>
        <dt>Trazo</dt><dd>1,5 redondo en todas las capas, el acento incluido. Al cuerpo blanco solo se le corta la silueta con un halo cuando una flecha o un clip lo rompen (reprogramar, restaurar, soportes).</dd>
        <dt>Sombra</dt><dd>Siempre visible. Es la silueta desplazada 1,8 unidades, que a 20 px son 2 px enteros, sin fleco a 1×. Usa el tinte del Inicio (cian al 58 %). Con hover se corre a 3 px y al pulsar a 0,5 px: el ícono «baja» sobre su sombra.</dd>
        <dt>Color</dt><dd>Trazo <code>--accion</code> y acento <code>--cian-trazo-fuerte</code> (#157fa6), que es nuevo: ≥3,37:1 en todos los fondos de la fila. El <code>--cian-trazo</code> de la ronda 1 bajaba a 2,71:1 sobre el disco en hover.</dd>
        <dt>Ver</dt><dd>Sin anillo (ronda 3). Destaca por el <b>tono</b> de su disco: <code>--disco-ver</code>, cian al 22 %, que no se confunde con el gris azulado del hover de los demás (<code>--disco-hover</code>). Con hover pasa a cian al 30 %. No se blanquea con la fila.</dd>
        <dt>Peligro</dt><dd>En reposo, trazo <code>--tinta-2</code> y sombra gris neutra, sin cian. Hay dos tipos. Lo irreversible (eliminar, quitar, anular) se pone rojo con hover. Lo reversible (archivar, desactivar) se pone ámbar <code>--aviso</code>.</dd>
        <dt>Utilitarios</dt><dd>Cerrar, chevrones, subir y bajar, y «quitar» de las líneas editables no llevan disco en reposo. Solo aparece con hover.</dd>
      </dl>
    </div>
    ${capas('editar')}
  </div>
  <h3>Estados · a 1× y 2×, con su contexto de fila</h3>
  ${tablaEstados}
</section>

<section id="contraste" class="bloque">
  <h2>Contrastes medidos (WCAG 2.x, objeto gráfico ≥ 3:1)</h2>
  <p class="intro">Cada color se mide solo contra los fondos donde de verdad aparece; «—» quiere decir que esa combinación no se da. En rojo, lo que no llega. La fila del <code>--cian-trazo</code> de la ronda 1 se deja como referencia: es la razón del token nuevo. El disco frente a la fila (1,14:1) no se mide, porque es la superficie del botón y no el portador del significado.</p>
  ${tablaContrastes}
</section>

<section id="tablas" class="bloque">
  <h2>En las tablas reales · antes y después</h2>
  <p class="intro">Datos de muestra, columnas recortadas. Las filas sombreadas simulan el puntero encima (<code>--fila-hover</code>) o la fila destacada (<code>--accion-tenue</code>). En algunos botones se fuerza el hover o el foco.</p>
  ${VISTAS.map((v) => `<article class="vista" id="v-${v.id}">
    <header><h3>${v.titulo}</h3><code>${v.ruta}</code>${v.nota ? `<p>${v.nota}</p>` : ''}</header>
    <div class="par">
      <div class="lado"><span class="lbl">antes</span><div class="card">${tabla(v, 'antes')}</div></div>
      <div class="lado"><span class="lbl lbl--nuevo">después</span><div class="card">${tabla(v, 'despues')}</div></div>
    </div>
  </article>`).join('')}
</section>

<section id="maximo" class="bloque">
  <h2>La fila con más acciones · Facturación › Emitidas, a 2×</h2>
  <p class="intro">Cinco ranuras: 5 × 28 + 4 × 4 = 156 px, lo mismo que hoy. El ojo cae siempre en la misma x y el hueco conserva su sitio.</p>
  <div class="zoom2">
    <div class="lado"><span class="lbl">antes</span><div class="row-actions">${FILA_MAX.map(btnAntes).join('')}</div></div>
    <div class="lado"><span class="lbl lbl--nuevo">después · reposo</span><div class="row-actions">${FILA_MAX.map(btnDespues).join('')}</div></div>
    <div class="lado"><span class="lbl lbl--nuevo">después · fila en hover, puntero en Enviar</span><div class="row-actions ctx-fila">${FILA_MAX.map((a, k) => btnDespues(k === 2 ? { ...a, estado: 'is-hover' } : a)).join('')}</div></div>
    <div class="lado"><span class="lbl lbl--nuevo">después · anulada (hueco)</span><div class="row-actions">${[{ n: 'ver' }, { n: 'documento' }, 'hueco', { n: 'contabilizacion' }, { n: 'historial' }].map(btnDespues).join('')}</div></div>
  </div>
  <h3 style="margin-top:24px">Densidad: diez filas seguidas, la cuarta en hover</h3>
  <div class="par">
    <div class="lado"><span class="lbl">antes</span><div class="card"><div class="densa">${Array.from({ length: 10 }, (_, k) => `<div class="row-actions${k === 3 ? ' is-row-hover' : ''}">${FILA_MAX.map((a, j) => (j === 2 && k % 4 === 2 ? 'hueco' : a)).map(btnAntes).join('')}</div>`).join('')}</div></div></div>
    <div class="lado"><span class="lbl lbl--nuevo">después</span><div class="card"><div class="densa">${Array.from({ length: 10 }, (_, k) => `<div class="row-actions${k === 3 ? ' is-row-hover' : ''}">${FILA_MAX.map((a, j) => (j === 2 && k % 4 === 2 ? 'hueco' : a)).map(btnDespues).join('')}</div>`).join('')}</div></div></div>
  </div>
</section>

<section id="angosta" class="bloque">
  <h2>Facturación angosta · contenedor de 1000 px (1366 al 125 %)</h2>
  <p class="intro">Dentro de <code>@container (max-width:1000px)</code> la fila de cinco ranuras pasa a disco de 26 e ícono de 18 (la misma proporción): 5 × 26 + 4 × 2 = 138 px, que sí caben. La sombra sigue en píxel entero (2 px; 3 px con hover).</p>
  <div class="zoom2">
    <div class="lado"><span class="lbl lbl--nuevo">ancho normal · 28 / 20</span><div class="row-actions">${FILA_MAX.map(btnDespues).join('')}</div></div>
    <div class="lado fac-cont" style="width:1000px;max-width:100%"><span class="lbl lbl--nuevo">contenedor ≤1000 px · 26 / 18</span><div class="row-actions fac-acciones" style="gap:2px">${FILA_MAX.map((a, k) => btnDespues(k === 2 ? { ...a, estado: 'is-hover' } : a)).join('')}</div></div>
  </div>
</section>

<section id="catalogo" class="bloque">
  <h2>Catálogo · cada ícono a tamaño real y a 4×</h2>
  <p class="intro">Antes: retícula 24 pintada a 16 px. Después: retícula 18 pintada a 20 px, en reposo, sobre la fila en hover y con hover. La ampliación a 4× va sobre su retícula y su disco.</p>
  ${GRUPOS.map(([g, ns]) => `<h3>${g}</h3><div class="cats">${ns.map(tarjeta).join('')}</div>`).join('')}
</section>

<section id="tactil" class="bloque">
  <h2>En táctil (sin hover) · 390 px</h2>
  <div class="movil">
    <div class="tel">
      <div class="tel__fila"><div><b>FE-1027</b><small>COMPAÑÍA DE SEGUROS BOLÍVAR S A</small></div><span class="num">$ 1.995.216</span></div>
      <div class="row-actions row-actions--tactil">${FILA_MAX.map(btnDespues).join('')}</div>
      <div class="tel__fila"><div><b>OS-2026-0312</b><small>TRANSPORTES DEL SUR SAS · Bolívar</small></div>${P('Sin programar', 'warning')}</div>
      <div class="row-actions row-actions--tactil">${[{ n: 'ver' }, { n: 'editar' }, { n: 'asignar', estado: 'is-active' }, { n: 'archivar' }].map(btnDespues).join('')}</div>
    </div>
    <ul class="notas">
      <li>36 × 36 <b>solo</b> en <code>.row-actions</code>: ni los 49 «Cerrar» de los modales ni el paginador crecen.</li>
      <li>El ícono sigue en 20 px. Lo que crece es el disco, que es el área que se puede tocar.</li>
      <li>Sin hover, el aviso es el pulsado: escala .97 y la sombra se pega al ícono mientras el dedo está encima.</li>
    </ul>
  </div>
</section>
</main>
</body></html>`;
fs.writeFileSync(path.join(AQUI, 'lamina.html'), html);
console.log('ok', Object.keys(ICONOS).length, 'íconos');

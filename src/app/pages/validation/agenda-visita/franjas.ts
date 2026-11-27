/**
 * ASG-02 · Reglas de la agenda de visita, sin Angular.
 *
 * 26/27-nov-2026 · Propuesta A «El formulario primero»: las franjas ya no se
 * pintan arrastrando sobre la rejilla, se escriben en un compositor (fecha,
 * desde, hasta) que valida en vivo y propone el siguiente hueco. Todas las
 * reglas que antes vivían repartidas por `validation.ts` (qué está ocupado,
 * hasta dónde se puede estirar una franja, el tope de horas de la orden) viven
 * aquí como funciones PURAS: reciben todo lo que necesitan en un `ContextoAgenda`
 * y no tocan señales, toasts ni el DOM. Así se prueban con `franjas.spec.ts` y
 * el compositor, la lista editable y la rejilla no pueden discrepar.
 *
 * Unidades: las fechas van en ISO local (`YYYY-MM-DD`) y las horas en MINUTOS
 * desde la medianoche; 1440 (= 24:00) es el fin válido de un día.
 */
import { FranjaVisita, Ocupacion, Orden } from '../../../core/models';
import { fechaLocal, hora12, rango12 } from '../../../core/fechas';

/* ===== Constantes de la jornada =====
   22-nov-2026 · La rejilla va de 6:00 a. m. a 12:00 a. m. a pedido del cliente
   («mínimo debe quedar hasta las 12:00am»): hay capacitaciones de turnos
   nocturnos. Una franja termina como mucho a las 24:00 (fin de ESE día; Postgres
   guarda `time '24:00'` y lo resta bien); lo que cruce la medianoche se parte. */
export const AG_DESDE_MIN = 6 * 60;
export const AG_HASTA_MIN = 24 * 60;
/** La unidad de la agenda: media hora. Los selects de Desde/Hasta van de 30 en 30. */
export const AG_PASO_MIN = 30;
/**
 * Duración de una visita cuando la OS no trae horas. Lo que ocupa una visita NO
 * es libre: son las horas asignadas de la orden, las mismas que el backend usa
 * para el `DTEND` del .ics y que valora la pre-cuenta (M9).
 */
export const AG_VISITA_MIN = 60;
/**
 * Jornada en la que el compositor busca la PROPUESTA (8:00 a. m.–6:00 p. m.) y
 * tope de lo que propone de una vez (una jornada de 8 h). Son supuestos de la
 * propuesta A pendientes de confirmar con la oficina (§11.4).
 */
export const JORNADA: readonly [number, number] = [8 * 60, 18 * 60];
export const PROPUESTA_MAX_MIN = 8 * 60;
/** Ventanas de la sugerencia de reparto: 8–12 y 2–6. */
export const VENTANAS: readonly (readonly [number, number])[] = [[8 * 60, 12 * 60], [14 * 60, 18 * 60]];
/** Si el reparto no cabe en tantos días, no se sugiere nada. */
export const SUGERENCIA_DIAS = 21;

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ===== Conversión de fechas y horas ===== */

/** Fecha local en el formato que espera <input type="date"> (YYYY-MM-DD). */
export function isoFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Hora local en el formato 'HH:MM'. */
export function isoHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 'HH:MM' → minutos desde medianoche (la unidad con la que trabaja la agenda). */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m || 0);
}

/** Minutos desde medianoche → 'HH:MM'. 1440 sale como '24:00', que es un fin válido. */
export function aHoraTexto(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** Suma días respetando el calendario local (meses y años incluidos). */
export function sumarDias(iso: string, dias: number): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  return isoFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias));
}

/**
 * Lunes de la semana a la que pertenece la fecha. La agenda es de lunes a
 * domingo (así se lee una semana laboral en Colombia), y `getDay()` devuelve 0
 * para el domingo, de ahí el corrimiento.
 */
export function lunesDe(iso: string): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  const corrimiento = (d.getDay() + 6) % 7;
  return isoFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate() - corrimiento));
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(iso: string): number {
  return fechaLocal(iso)?.getDay() ?? -1;
}

/**
 * ¿Día hábil para PROPONER? Lunes a sábado. No hay calendario de festivos en
 * ORBITA (§11.5 de la propuesta): un festivo se propone como un día cualquiera.
 * El domingo se puede elegir a mano; solo no se propone.
 */
export function esHabil(iso: string): boolean {
  const d = diaSemana(iso);
  return d >= 1 && d <= 6;
}

/**
 * Número a la colombiana ("4", "4,5", "1.234,5") → número.
 *
 * El punto solo es separador de miles **cuando hay coma**. Sin coma es el
 * decimal, que es como llega `horas_asignadas` desde la BD (NUMERIC → "8.00"):
 * borrarlo convertía 8 horas en 800 y el bloque de esa OS se comía el día
 * entero en la agenda.
 */
export function aNumeroCO(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = (v ?? '').toString().trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Minutos que ocupa una OS en la agenda: sus horas, o una hora si no trae.
 *
 * El tope de 24 h no va aquí sino en `duracionEnLaRejilla`: una OS de 50 h se
 * creía de 24 h, la agenda la daba por completa y el servidor —que sí sabía que
 * eran 50— guardaba un avance con «faltan 0 h», que no hay forma de entender.
 */
export function duracionDeOrden(horas: string | number | null | undefined): number {
  const h = aNumeroCO(horas);
  return h > 0 ? Math.round(h * 60) : AG_VISITA_MIN;
}

/**
 * Lo mismo, acotado a un día, para PINTAR el bloque de otra visita: una orden de
 * 50 h ocupa varios días y su bloque no puede desbordar la columna del día en que
 * empieza.
 */
export function duracionEnLaRejilla(horas: string | number | null | undefined): number {
  return Math.min(duracionDeOrden(horas), 24 * 60);
}

/* ===== Textos ===== */

/** Minutos → "4 h", "1 h 30 min", "30 min". */
export function duracionTexto(min: number): string {
  if (min <= 0) return '0 h';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

/** «vie 27 nov»: dentro de una frase. */
export function fechaCorta(iso: string): string {
  const d = fechaLocal(iso);
  return d ? `${DIAS_CORTOS[d.getDay()].toLowerCase()} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` : iso;
}

/** «Vie 27 nov»: al principio de una fila. */
export function fechaFila(iso: string): string {
  const d = fechaLocal(iso);
  return d ? `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` : iso;
}

/** «viernes 27 de noviembre de 2026». */
export function fechaLarga(iso: string): string {
  const d = fechaLocal(iso);
  return d ? `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}` : iso;
}

/** «viernes 27 de noviembre»: para lectores de pantalla y etiquetas de botón. */
export function fechaLectura(iso: string): string {
  const d = fechaLocal(iso);
  return d ? `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}` : iso;
}

/** «Vie 27» del chip de día (con «Hoy» para hoy). */
export function nombreChipDia(iso: string, hoy: string): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  return `${iso === hoy ? 'Hoy' : DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
}

/** «24 nov» de un instante ISO (cuándo salió el correo de una franja). */
export function diaMesDe(instante: string | null | undefined): string {
  if (!instante) return '';
  const d = new Date(instante);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

/* ===== Contexto ===== */

/** Otra visita del asesor, ya traducida a fecha y minutos locales. */
export interface VisitaAjena {
  id: string;
  fecha: string;
  ini: number;
  fin: number;
  codigo: string;
  empresa: string;
}

/**
 * Todo lo que las reglas necesitan saber. Lo arma el componente a partir de sus
 * entradas; las funciones no leen nada más.
 */
export interface ContextoAgenda {
  /** ¿Hay asesor elegido? Sin él no hay disponibilidad que respetar ni dueño para las horas. */
  conProfesional: boolean;
  /** Nombre corto del asesor activo, para los textos («Daniela tiene…»). */
  nombre: string;
  ocupaciones: readonly Pick<Ocupacion, 'id' | 'fecha' | 'hora_inicio' | 'hora_fin' | 'motivo'>[];
  otrasVisitas: readonly VisitaAjena[];
  /** Franjas del asesor activo en ESTA orden. */
  propias: readonly FranjaVisita[];
  /** Horas de la orden en minutos; 0 = sin tope. */
  minutosOrden: number;
  /**
   * Lo que ya suman los DEMÁS asesores de la orden (y las franjas huérfanas, sin
   * asesor): el tope es de la orden, no de cada uno (22-nov: se llegaron a marcar
   * 32 h en una orden de 4 h porque esas no contaban).
   */
  minutosOtros: number;
  /** Hoy (ISO local) y la hora actual en minutos: lo pasado no se agenda. */
  hoy: string;
  ahoraMin: number;
}

/** Algo que ocupa al asesor en un rato de un día. */
export interface Obstaculo {
  ini: number;
  fin: number;
  tipo: 'ocupado' | 'otra' | 'propia';
  /** Ocupado: el motivo. Otra: el código. Propia: vacío. */
  motivo: string;
  empresa?: string;
  /** Ocupación (para liberarla) o franja propia que representa. */
  id?: string;
  franja?: FranjaVisita;
}

/** Rango candidato de una franja. */
export interface RangoFranja {
  fecha: string;
  ini: number;
  fin: number;
}

export interface Ajuste {
  ini: number;
  fin: number;
  texto: string;
}

/**
 * Resultado de validar una franja. `problema` es la frase que ve la persona y
 * `ajuste`, la salida con un botón («Terminar a las 10:00 a. m.»).
 */
export type Validacion =
  | { ok: true; texto: string }
  | { ok: false; tipo: 'error' | 'aviso'; problema: string; detalle?: string; ajuste?: Ajuste };

/** Otra OS del asesor como obstáculo. Lee la hora LOCAL de `fecha_programada`. */
export function visitaAjena(o: Pick<Orden, 'id' | 'codigo' | 'empresa_nombre' | 'fecha_programada' | 'horas_asignadas'>): VisitaAjena | null {
  const cita = o.fecha_programada ? new Date(o.fecha_programada) : null;
  if (!cita || Number.isNaN(cita.getTime())) return null;
  const ini = cita.getHours() * 60 + cita.getMinutes();
  return {
    id: o.id,
    fecha: isoFecha(cita),
    ini,
    fin: ini + duracionEnLaRejilla(o.horas_asignadas),
    codigo: o.codigo,
    empresa: o.empresa_nombre || o.codigo,
  };
}

/** Minutos que suman unas franjas. */
export function minutosDe(franjas: readonly Pick<FranjaVisita, 'hora_inicio' | 'hora_fin'>[]): number {
  return franjas.reduce((t, f) => t + (aMinutos(f.hora_fin) - aMinutos(f.hora_inicio)), 0);
}

/**
 * Lo que ocupa al asesor ese día, ordenado. Las franjas de OTROS asesores de la
 * misma orden no están: pueden ir a la vez, eso no es choque (§11.8).
 * `excluirId` saca la franja que se está editando (no choca contra sí misma).
 */
export function obstaculos(ctx: ContextoAgenda, fecha: string, excluirId?: string | null): Obstaculo[] {
  const out: Obstaculo[] = [];
  for (const s of ctx.ocupaciones) {
    if (s.fecha !== fecha) continue;
    out.push({ ini: aMinutos(s.hora_inicio), fin: aMinutos(s.hora_fin), tipo: 'ocupado', motivo: s.motivo || 'Ocupado', id: s.id });
  }
  for (const v of ctx.otrasVisitas) {
    if (v.fecha !== fecha) continue;
    out.push({ ini: v.ini, fin: v.fin, tipo: 'otra', motivo: v.codigo, empresa: v.empresa, id: v.id });
  }
  for (const f of ctx.propias) {
    if (f.fecha !== fecha || f.id === excluirId) continue;
    out.push({ ini: aMinutos(f.hora_inicio), fin: aMinutos(f.hora_fin), tipo: 'propia', motivo: '', id: f.id, franja: f });
  }
  return out.sort((a, b) => a.ini - b.ini || a.fin - b.fin);
}

/**
 * Lo que ocupa al asesor en ese rato: una franja bloqueada de su agenda o la
 * visita de otra OS suya (no sus franjas de esta orden). Null si está libre.
 */
export function ocupacionEn(ctx: ContextoAgenda, fecha: string, ini: number, fin: number): Obstaculo | null {
  return obstaculos(ctx, fecha).find((o) => o.tipo !== 'propia' && o.ini < fin && ini < o.fin) ?? null;
}

/**
 * Minutos que todavía se pueden programar. Al editar, la franja que se edita
 * devuelve su tiempo: moverla no debe chocar con el tope por sí misma.
 * `Infinity` si la orden no tiene tope.
 */
export function disponible(ctx: ContextoAgenda, excluirId?: string | null): number {
  if (ctx.minutosOrden <= 0) return Infinity;
  const propias = minutosDe(ctx.propias.filter((f) => f.id !== excluirId));
  return Math.max(0, ctx.minutosOrden - ctx.minutosOtros - propias);
}

/** Minutos que faltan por repartir en la orden (nunca negativo). */
export function faltan(ctx: ContextoAgenda): number {
  const d = disponible(ctx);
  return Number.isFinite(d) ? d : 0;
}

/**
 * Hasta dónde llega una franja que empieza en `desde` sin pisar nada: muere
 * justo antes del primer obstáculo que empiece después, y nunca pasa del tope de
 * horas de la orden. Calcula el «Terminar a las …» de los ajustes y la propuesta
 * de un toque en la rejilla.
 */
export function recortar(ctx: ContextoAgenda, fecha: string, desde: number, hasta: number, excluirId?: string | null): number {
  let tope = Math.min(hasta, AG_HASTA_MIN);
  const disp = disponible(ctx, excluirId);
  if (Number.isFinite(disp)) tope = Math.min(tope, desde + Math.max(AG_PASO_MIN, disp));
  for (const o of obstaculos(ctx, fecha, excluirId)) {
    if (o.ini > desde) tope = Math.min(tope, o.ini);
  }
  return Math.max(desde + AG_PASO_MIN, tope);
}

/**
 * Espejo de `recortar`: el primer minuto libre a partir de `desde`, saltando lo
 * que lo ocupe (varios obstáculos seguidos también). Da el «Empezar a las …».
 * Null si no queda nada libre ese día.
 */
export function adelantar(ctx: ContextoAgenda, fecha: string, desde: number, excluirId?: string | null): number | null {
  let cur = desde;
  const lista = obstaculos(ctx, fecha, excluirId);
  let movido = true;
  while (movido) {
    movido = false;
    for (const o of lista) {
      if (o.ini <= cur && cur < o.fin) {
        cur = o.fin;
        movido = true;
      }
    }
  }
  return cur < AG_HASTA_MIN ? cur : null;
}

/** Primer minuto agendable de un día: lo pasado de hoy no cuenta. Null si el día ya pasó. */
function inicioDelDia(ctx: ContextoAgenda, fecha: string): number | null {
  if (fecha < ctx.hoy) return null;
  if (fecha === ctx.hoy) return Math.max(AG_DESDE_MIN, Math.ceil(ctx.ahoraMin / AG_PASO_MIN) * AG_PASO_MIN);
  return AG_DESDE_MIN;
}

/**
 * Huecos libres del día entre las 6:00 a. m. y las 12:00 a. m. (de al menos
 * media hora). Es el equivalente accesible de la rejilla: cada hueco es un botón
 * del compositor.
 */
export function huecosDelDia(ctx: ContextoAgenda, fecha: string, excluirId?: string | null): [number, number][] {
  let cur = inicioDelDia(ctx, fecha);
  if (cur === null) return [];
  const out: [number, number][] = [];
  for (const o of obstaculos(ctx, fecha, excluirId)) {
    if (o.ini > cur) out.push([cur, Math.min(o.ini, AG_HASTA_MIN)]);
    cur = Math.max(cur, o.fin);
  }
  if (cur < AG_HASTA_MIN) out.push([cur, AG_HASTA_MIN]);
  return out.filter(([a, b]) => b - a >= AG_PASO_MIN);
}

/** Minutos libres de un día dentro de una ventana. */
function libresEn(ctx: ContextoAgenda, fecha: string, ventana: readonly [number, number]): number {
  return huecosDelDia(ctx, fecha).reduce(
    (t, [a, b]) => t + Math.max(0, Math.min(b, ventana[1]) - Math.max(a, ventana[0])),
    0,
  );
}

/**
 * Lo que dice el chip de un día: «Libre», «6 h libres», «Fuera de horario» o
 * «Sin huecos» (y entonces no se puede elegir). Mide la jornada de 8 a 6.
 */
export function estadoDelDia(ctx: ContextoAgenda, fecha: string): { texto: string; sinHuecos: boolean } {
  if (!huecosDelDia(ctx, fecha).length) return { texto: 'Sin huecos', sinHuecos: true };
  const libres = libresEn(ctx, fecha, JORNADA);
  if (libres >= JORNADA[1] - JORNADA[0]) return { texto: 'Libre', sinHuecos: false };
  if (libres > 0) return { texto: `${duracionTexto(libres)} libres`, sinHuecos: false };
  return { texto: 'Fuera de horario', sinHuecos: false };
}

/** Cuánto proponer de una vez: lo que falta, con tope de una jornada; sin tope de orden, 8 h. */
function duracionPropuesta(ctx: ContextoAgenda): number {
  const resta = faltan(ctx);
  return ctx.minutosOrden > 0 ? Math.min(Math.max(AG_PASO_MIN, resta), PROPUESTA_MAX_MIN) : PROPUESTA_MAX_MIN;
}

/**
 * Propuesta del compositor: el primer hueco de jornada (8 a. m.–6 p. m.) desde
 * `desdeFecha` a partir del minuto `desdeMin` (solo ese primer día), en días
 * hábiles, con lo que falta (tope 8 h). Null si ya no falta nada o no hay hueco
 * en 45 días.
 */
export function proponerSiguiente(ctx: ContextoAgenda, desdeFecha: string, desdeMin = 0): RangoFranja | null {
  if (!ctx.conProfesional) return null;
  if (ctx.minutosOrden > 0 && !faltan(ctx)) return null;
  const dur = duracionPropuesta(ctx);
  for (let i = 0; i < 45; i++) {
    const fecha = sumarDias(desdeFecha, i);
    if (!esHabil(fecha)) continue;
    for (const [h0, h1] of huecosDelDia(ctx, fecha)) {
      const a = Math.max(h0, JORNADA[0], i === 0 ? desdeMin : 0);
      const b = Math.min(h1, JORNADA[1]);
      if (b - a >= AG_PASO_MIN) return { fecha, ini: a, fin: a + Math.min(dur, b - a) };
    }
  }
  return null;
}

/**
 * Al elegir un día en el compositor: su primer hueco de jornada; si no hay, el
 * primero que haya; si el día está lleno, se conservan las horas que había (la
 * línea de validación dirá que no hay hueco).
 */
export function proponerEnDia(ctx: ContextoAgenda, fecha: string, actual?: { ini: number; fin: number } | null): RangoFranja {
  const dur = duracionPropuesta(ctx);
  const hs = huecosDelDia(ctx, fecha);
  for (const [h0, h1] of hs) {
    const a = Math.max(h0, JORNADA[0]);
    const b = Math.min(h1, JORNADA[1]);
    if (b - a >= AG_PASO_MIN) return { fecha, ini: a, fin: a + Math.min(dur, b - a) };
  }
  if (hs.length) return { fecha, ini: hs[0][0], fin: hs[0][0] + Math.min(dur, hs[0][1] - hs[0][0]) };
  return { fecha, ini: actual?.ini ?? JORNADA[0], fin: actual?.fin ?? JORNADA[0] + 4 * 60 };
}

/**
 * Sugerencia de reparto: recorre los días hábiles desde `desdeFecha` (lunes a
 * sábado), llena las ventanas de 8–12 y 2–6 descontando lo ocupado y para al
 * cubrir lo que falta. Null si no falta nada o no cabe en 21 días.
 */
export function sugerirReparto(ctx: ContextoAgenda, desdeFecha: string): RangoFranja[] | null {
  if (!ctx.conProfesional || ctx.minutosOrden <= 0) return null;
  let resta = faltan(ctx);
  if (!resta) return null;
  const out: RangoFranja[] = [];
  for (let i = 0; i < SUGERENCIA_DIAS && resta > 0; i++) {
    const fecha = sumarDias(desdeFecha, i);
    if (!esHabil(fecha)) continue;
    const hs = huecosDelDia(ctx, fecha);
    for (const v of VENTANAS) {
      for (const [h0, h1] of hs) {
        const a = Math.max(h0, v[0]);
        const b = Math.min(h1, v[1]);
        if (b - a < AG_PASO_MIN || resta <= 0) continue;
        const t = Math.min(resta, b - a);
        out.push({ fecha, ini: a, fin: a + t });
        resta -= t;
      }
    }
  }
  return resta > 0 ? null : out;
}

/**
 * ¿Se puede agregar (o dejar, al editar) esta franja? Reúne las reglas que antes
 * repartía `agregarFranjaVisita` entre toasts: sin profesional no hay franja; no
 * se cruza con otra suya de la misma visita; no pisa su agenda ni sus otras
 * órdenes; no se pasa de las horas de la orden sumando a TODOS los asesores.
 * Devuelve el problema en palabras y, si existe, el ajuste que lo resuelve.
 */
export function validarFranja(ctx: ContextoAgenda, r: RangoFranja, excluirId?: string | null): Validacion {
  if (!ctx.conProfesional) {
    return { ok: false, tipo: 'error', problema: 'Primero elija el profesional.', detalle: 'Seleccione en la lista quién ejecuta la visita.' };
  }
  if (!r.fecha) return { ok: false, tipo: 'error', problema: 'Elija la fecha de la franja.' };
  if (r.fin <= r.ini) return { ok: false, tipo: 'error', problema: 'La hora final debe ser después de la inicial.' };
  if (r.ini < 0 || r.fin > AG_HASTA_MIN) {
    return { ok: false, tipo: 'error', problema: 'La franja debe terminar como mucho a las 12:00 a. m.' };
  }
  // Lo pasado no se agenda desde aquí: el compositor no ofrece fechas anteriores
  // a hoy (§11.6). Una visita ya hecha se registra de otra forma.
  if (r.fecha < ctx.hoy || (r.fecha === ctx.hoy && r.ini < ctx.ahoraMin)) {
    return { ok: false, tipo: 'error', problema: 'Esa hora ya pasó. Elija una fecha u hora posterior.' };
  }

  const choque = obstaculos(ctx, r.fecha, excluirId).find((o) => o.ini < r.fin && r.ini < o.fin);
  if (choque) {
    let problema: string;
    if (choque.tipo === 'propia') {
      problema = `Se cruza con su franja del ${fechaCorta(r.fecha)}, ${rango12(choque.ini, choque.fin)}.`;
    } else if (choque.tipo === 'otra') {
      problema = `A esa hora ${ctx.nombre} tiene la orden ${choque.motivo} en ${choque.empresa} (${rango12(choque.ini, choque.fin)}).`;
    } else {
      problema = `${ctx.nombre} tiene «${choque.motivo}» de ${hora12(choque.ini)} a ${hora12(choque.fin)}.`;
    }
    let ajuste: Ajuste | undefined;
    if (choque.ini > r.ini) {
      ajuste = { ini: r.ini, fin: choque.ini, texto: `Terminar a las ${hora12(choque.ini)}` };
    } else {
      const nuevoIni = adelantar(ctx, r.fecha, r.ini, excluirId);
      if (nuevoIni !== null && nuevoIni < r.fin) {
        ajuste = { ini: nuevoIni, fin: recortar(ctx, r.fecha, nuevoIni, r.fin, excluirId), texto: `Empezar a las ${hora12(nuevoIni)}` };
      }
    }
    return { ok: false, tipo: 'aviso', problema, detalle: ajuste ? undefined : 'Elija otro hueco.', ajuste };
  }

  // Tope duro: la pre-cuenta (M9) valora las horas contratadas con la ARL, así
  // que programar de más es trabajo que nadie factura.
  const disp = disponible(ctx, excluirId);
  if (r.fin - r.ini > disp) {
    if (!disp) return { ok: false, tipo: 'aviso', problema: 'La visita ya tiene todas las horas de la orden.' };
    return {
      ok: false,
      tipo: 'aviso',
      problema: `Se pasa de las horas de la orden: quedan ${duracionTexto(disp)}.`,
      ajuste: { ini: r.ini, fin: r.ini + disp, texto: `Dejarla en ${duracionTexto(disp)}` },
    };
  }
  return { ok: true, texto: `Libre · ${duracionTexto(r.fin - r.ini)}. Termina a las ${hora12(r.fin)}` };
}

/** ¿La franja ya ocurrió? (su fin es anterior a ahora). */
export function yaPaso(ctx: Pick<ContextoAgenda, 'hoy' | 'ahoraMin'>, f: Pick<FranjaVisita, 'fecha' | 'hora_fin'>): boolean {
  return f.fecha < ctx.hoy || (f.fecha === ctx.hoy && aMinutos(f.hora_fin) <= ctx.ahoraMin);
}

/** ¿El asesor ya la recibió y no se ha tocado desde entonces? */
export function estaEnviada(f: Pick<FranjaVisita, 'enviada_en' | 'cambiada'>): boolean {
  return !!f.enviada_en && !f.cambiada;
}

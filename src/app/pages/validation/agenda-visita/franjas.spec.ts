/**
 * Pruebas de las reglas puras de la agenda (propuesta A, 27-nov-2026).
 * Escenario del prototipo: «hoy» es el jueves 26 nov 2026 a las 3:00 p. m. y
 * la orden tiene 15 h. Daniela tiene capacitación el vie 27 de 8 a 10 y otra
 * orden el lun 30 de 2 a 6 p. m.
 */
import { FranjaVisita } from '../../../core/models';
import {
  adelantar, aHoraTexto, aMinutos, ContextoAgenda, disponible, duracionTexto, estadoDelDia, faltan,
  huecosDelDia, lunesDe, ocupacionEn, proponerEnDia, proponerSiguiente, recortar, sugerirReparto,
  validarFranja, yaPaso,
} from './franjas';

const H = (h: number, m = 0) => h * 60 + m;

function franja(id: string, fecha: string, ini: number, fin: number, extra: Partial<FranjaVisita> = {}): FranjaVisita {
  return { id, fecha, hora_inicio: aHoraTexto(ini), hora_fin: aHoraTexto(fin), ...extra };
}

function ctx(extra: Partial<ContextoAgenda> = {}): ContextoAgenda {
  return {
    conProfesional: true,
    nombre: 'Daniela',
    ocupaciones: [
      { id: 'o1', fecha: '2026-11-27', hora_inicio: '08:00', hora_fin: '10:00', motivo: 'Capacitación interna' },
      { id: 'o2', fecha: '2026-12-02', hora_inicio: '06:00', hora_fin: '24:00', motivo: 'Permiso personal' },
    ],
    otrasVisitas: [{ id: 'v1', fecha: '2026-11-30', ini: H(14), fin: H(18), codigo: 'OS-2026-0398', empresa: 'Hospital San Pedro' }],
    propias: [],
    minutosOrden: H(15),
    minutosOtros: 0,
    hoy: '2026-11-26',
    ahoraMin: H(15),
    ...extra,
  };
}

describe('conversiones', () => {
  it('ida y vuelta de horas, con 24:00 como fin válido', () => {
    expect(aMinutos('08:30')).toBe(510);
    expect(aHoraTexto(1440)).toBe('24:00');
    expect(lunesDe('2026-11-29')).toBe('2026-11-23');
    expect(duracionTexto(90)).toBe('1 h 30 min');
    expect(duracionTexto(30)).toBe('30 min');
  });
});

describe('ocupación y huecos', () => {
  it('encuentra la ocupación y la otra orden, no las franjas propias', () => {
    const c = ctx({ propias: [franja('f1', '2026-11-27', H(14), H(16))] });
    expect(ocupacionEn(c, '2026-11-27', H(9), H(11))?.motivo).toBe('Capacitación interna');
    expect(ocupacionEn(c, '2026-11-30', H(17), H(19))?.tipo).toBe('otra');
    expect(ocupacionEn(c, '2026-11-27', H(14), H(15))).toBeNull();
  });

  it('huecos del día descuentan lo ocupado; hoy y los días pasados van completos', () => {
    expect(huecosDelDia(ctx(), '2026-11-27')).toEqual([[H(6), H(8)], [H(10), H(24)]]);
    expect(huecosDelDia(ctx(), '2026-11-26')).toEqual([[H(6), H(24)]]);
    expect(huecosDelDia(ctx(), '2026-11-25')).toEqual([[H(6), H(24)]]);
    expect(huecosDelDia(ctx(), '2026-12-02')).toEqual([]);
  });

  it('el chip del día dice cómo está la jornada', () => {
    expect(estadoDelDia(ctx(), '2026-11-28').texto).toBe('Libre');
    expect(estadoDelDia(ctx(), '2026-11-27').texto).toBe('8 h libres');
    expect(estadoDelDia(ctx(), '2026-12-02')).toEqual({ texto: 'Sin huecos', sinHuecos: true });
  });
});

describe('tope de la orden', () => {
  it('suma a TODOS los asesores (y las huérfanas van en minutosOtros)', () => {
    const c = ctx({ minutosOtros: H(8), propias: [franja('f1', '2026-11-28', H(8), H(12))] });
    expect(faltan(c)).toBe(H(3));
    // Al editar, la franja propia devuelve su tiempo.
    expect(disponible(c, 'f1')).toBe(H(7));
  });

  it('sin horas en la orden no hay tope', () => {
    expect(disponible(ctx({ minutosOrden: 0 }))).toBe(Infinity);
  });
});

describe('recortar y adelantar', () => {
  it('recortar muere antes del siguiente obstáculo y del tope', () => {
    expect(recortar(ctx(), '2026-11-27', H(6), H(12))).toBe(H(8));
    expect(recortar(ctx({ minutosOtros: H(13) }), '2026-11-28', H(8), H(18))).toBe(H(10));
    // Nunca menos de media hora.
    expect(recortar(ctx(), '2026-11-27', H(7, 30), H(7, 30))).toBe(H(8));
  });

  it('adelantar salta obstáculos encadenados', () => {
    const c = ctx({ propias: [franja('f1', '2026-11-27', H(10), H(12))] });
    expect(adelantar(c, '2026-11-27', H(9))).toBe(H(12));
    expect(adelantar(c, '2026-11-27', H(7))).toBe(H(7));
    expect(adelantar(ctx(), '2026-12-02', H(8))).toBeNull();
  });
});

describe('validarFranja', () => {
  it('sin profesional no deja agendar', () => {
    const v = validarFranja(ctx({ conProfesional: false }), { fecha: '2026-11-28', ini: H(8), fin: H(9) });
    expect(v.ok).toBe(false);
  });

  it('libre: dice la duración y la hora de fin', () => {
    const v = validarFranja(ctx(), { fecha: '2026-11-27', ini: H(10), fin: H(18) });
    expect(v.ok && v.texto.replace(/ /g, ' ')).toBe('Libre · 8 h. Termina a las 6:00 p. m.');
  });

  it('hasta antes de desde', () => {
    const v = validarFranja(ctx(), { fecha: '2026-11-27', ini: H(12), fin: H(11) });
    expect(v.ok === false && v.problema).toBe('La hora final debe ser después de la inicial.');
  });

  it('lo pasado también se agenda (27-nov: meses anteriores)', () => {
    expect(validarFranja(ctx(), { fecha: '2026-11-26', ini: H(9), fin: H(10) }).ok).toBe(true);
    expect(validarFranja(ctx(), { fecha: '2026-11-26', ini: H(16), fin: H(17) }).ok).toBe(true);
    expect(validarFranja(ctx(), { fecha: '2026-10-05', ini: H(8), fin: H(12) }).ok).toBe(true);
  });

  it('choque con ocupación: propone empezar después', () => {
    const v = validarFranja(ctx(), { fecha: '2026-11-27', ini: H(8), fin: H(12) });
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.problema).toContain('«Capacitación interna»');
    expect(v.ajuste).toMatchObject({ ini: H(10), fin: H(12) });
    expect(v.ajuste?.texto).toContain('Empezar a las 10:00');
  });

  it('choque con otra orden: propone terminar antes', () => {
    const v = validarFranja(ctx(), { fecha: '2026-11-30', ini: H(12), fin: H(16) });
    if (v.ok) throw new Error('debía chocar');
    expect(v.problema).toContain('la orden OS-2026-0398 en Hospital San Pedro');
    expect(v.ajuste).toMatchObject({ ini: H(12), fin: H(14) });
  });

  it('choque con otra franja suya; editándola no choca contra sí misma', () => {
    const c = ctx({ propias: [franja('f1', '2026-11-28', H(14), H(18))] });
    const v = validarFranja(c, { fecha: '2026-11-28', ini: H(13), fin: H(15) });
    if (v.ok) throw new Error('debía chocar');
    expect(v.problema).toContain('Se cruza con su franja del sáb 28 nov');
    expect(validarFranja(c, { fecha: '2026-11-28', ini: H(13), fin: H(15) }, 'f1').ok).toBe(true);
  });

  it('dos asesores en el mismo rato no es choque (las del otro no son obstáculo)', () => {
    const c = ctx({ minutosOtros: H(8) });
    expect(validarFranja(c, { fecha: '2026-11-27', ini: H(10), fin: H(14) }).ok).toBe(true);
  });

  it('tope: propone dejarla en lo que queda', () => {
    const v = validarFranja(ctx({ minutosOtros: H(12) }), { fecha: '2026-11-28', ini: H(8), fin: H(16) });
    if (v.ok) throw new Error('debía pasarse');
    expect(v.problema).toBe('Se pasa de las horas de la orden: quedan 3 h.');
    expect(v.ajuste).toMatchObject({ ini: H(8), fin: H(11), texto: 'Dejarla en 3 h' });
  });

  it('visita completa', () => {
    const v = validarFranja(ctx({ minutosOtros: H(15) }), { fecha: '2026-11-28', ini: H(8), fin: H(9) });
    expect(v.ok === false && v.problema).toBe('La visita ya tiene todas las horas de la orden.');
  });
});

describe('propuestas', () => {
  it('primer hueco de jornada desde mañana, tope 8 h', () => {
    expect(proponerSiguiente(ctx(), '2026-11-27')).toEqual({ fecha: '2026-11-27', ini: H(10), fin: H(18) });
  });

  it('tras agregar sigue en el mismo día si queda, si no al siguiente hábil (salta el domingo)', () => {
    const c = ctx({ propias: [franja('f1', '2026-11-28', H(8), H(18))] });
    // Sábado lleno de 8 a 6 → el domingo no se propone → lunes.
    expect(proponerSiguiente(c, '2026-11-28', H(18))).toEqual({ fecha: '2026-11-30', ini: H(8), fin: H(13) });
  });

  it('sin profesional o sin horas por repartir no propone', () => {
    expect(proponerSiguiente(ctx({ conProfesional: false }), '2026-11-27')).toBeNull();
    expect(proponerSiguiente(ctx({ minutosOtros: H(15) }), '2026-11-27')).toBeNull();
  });

  it('al elegir un día lleno conserva las horas actuales', () => {
    expect(proponerEnDia(ctx(), '2026-12-02', { ini: H(9), fin: H(11) })).toEqual({ fecha: '2026-12-02', ini: H(9), fin: H(11) });
    expect(proponerEnDia(ctx(), '2026-11-27')).toEqual({ fecha: '2026-11-27', ini: H(10), fin: H(18) });
  });

  it('sugerencia de reparto en ventanas de 8–12 y 2–6', () => {
    const s = sugerirReparto(ctx(), '2026-11-27');
    expect(s).toEqual([
      { fecha: '2026-11-27', ini: H(10), fin: H(12) },
      { fecha: '2026-11-27', ini: H(14), fin: H(18) },
      { fecha: '2026-11-28', ini: H(8), fin: H(12) },
      { fecha: '2026-11-28', ini: H(14), fin: H(18) },
      { fecha: '2026-11-30', ini: H(8), fin: H(9) },
    ]);
    const total = (s ?? []).reduce((t, x) => t + x.fin - x.ini, 0);
    expect(total).toBe(H(15));
  });

  it('si no cabe en 21 días no sugiere', () => {
    const todo = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 10, 27 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { id: `x${i}`, fecha: iso, hora_inicio: '06:00', hora_fin: '24:00', motivo: 'Vacaciones' };
    });
    expect(sugerirReparto(ctx({ ocupaciones: todo }), '2026-11-27')).toBeNull();
  });
});

describe('franjas enviadas', () => {
  it('yaPaso mira la fecha y la hora de fin', () => {
    const c = ctx();
    expect(yaPaso(c, franja('a', '2026-11-23', H(8), H(12)))).toBe(true);
    expect(yaPaso(c, franja('b', '2026-11-26', H(8), H(15)))).toBe(true);
    expect(yaPaso(c, franja('c', '2026-11-26', H(14), H(16)))).toBe(false);
  });
});

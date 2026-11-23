/**
 * Estadísticas de Finanzas · forma del JSON de `GET /api/informes-contables/estadisticas`
 * (veredicto del 20-nov-2026, §5.4). Viven aquí y no en `core/models.ts` para no
 * chocar con el equipo de Operación.
 *
 * Los montos llegan como TEXTO con dos decimales ("2451899.58") y las fechas como
 * `AAAA-MM-DD`: así salen de NUMERIC(16,2) y de `to_char`, sin pasar por float ni
 * por la zona horaria.
 */

export type TipoPeriodo = 'mes' | 'trimestre' | 'anio';
export type EdadCxc = 'POR_VENCER' | 'D1_30' | 'D31_60' | 'D61_90' | 'MAS_90';
/** Monto en texto decimal, tal como lo manda el servidor. */
export type Monto = string;

export interface PeriodoFinanzas {
  tipo: TipoPeriodo;
  desde: string;
  fin: string;
  corte: string;
  en_curso: boolean;
  provisional: boolean;
  comparacion: { desde: string; corte: string };
}

export interface CoberturaFinanzas {
  documentos: number;
  contabilizados: number;
  pendientes: number;
  con_error: number;
  comprobantes_borrador: number;
  meses: number;
  meses_cerrados: number;
}

export interface ResumenFinanzas {
  facturacion: { neto: Monto; anterior: Monto; facturas: number; notas: number };
  recaudo: { valor: Monto; anterior: Monto; retenido: Monto };
  cartera: { saldo: Monto; vencido: Monto; anterior: Monto };
  por_pagar: { saldo: Monto; vencido: Monto; vence_7_dias: Monto; anterior: Monto };
  resultado: {
    ingresos: Monto; costos: Monto; gastos: Monto; utilidad: Monto; anterior: Monto; movimientos: number;
  };
  profesionales: { neto: Monto; anterior: Monto; documentos: number };
}

export interface MesFinanzas {
  /** AAAA-MM */
  mes: string;
  en_periodo: boolean;
  actual: boolean;
  cerrado: boolean;
  facturado_neto: Monto;
  facturado_total: Monto;
  recaudado: Monto;
  ingresos: Monto;
  costos_gastos: Monto;
  utilidad: Monto;
}

export interface EstadisticasFinanzas {
  periodo: PeriodoFinanzas;
  /** Primer día con documentos o comprobantes; null si aún no hay nada. */
  desde_datos: string | null;
  cobertura: CoberturaFinanzas;
  resumen: ResumenFinanzas;
  meses: MesFinanzas[];
  clientes: {
    top: { tercero_id: string; nombre: string; valor: Monto }[];
    otros: { valor: Monto; clientes: number };
    total: Monto;
  };
  notas_credito: {
    valor: Monto;
    facturado_bruto: Monto;
    por_causal: { causal: string | null; notas: number; valor: Monto }[];
  };
  edades_cxc: { edad: EdadCxc; documentos: number; valor: Monto }[];
  por_pagar: { saldo: Monto; vencido: Monto; vence_7_dias: Monto; pagado_periodo: Monto };
  resultado: {
    cuentas: { codigo: string; nombre: string; valor: Monto }[];
    otras: Monto;
    nomina: { devengado: Monto; empleados: number };
  };
}

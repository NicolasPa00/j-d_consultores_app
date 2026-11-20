import { Pipe, PipeTransform } from '@angular/core';

/**
 * '2026-09-30' o '2026-09-30T05:00:00.000Z' (un DATE serializado) → '30/09/2026'.
 * Es la misma regla que `fecha()` de Facturación: toda la plataforma muestra
 * dd/mm/aaaa, y una fecha que se lee distinta según la vista confunde a la
 * contadora. Lee los dígitos tal cual, sin pasar por `Date`, para que la zona
 * horaria no corra el día.
 */
@Pipe({ name: 'fechaDmy' })
export class FechaDmyPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (valor || '—');
  }
}

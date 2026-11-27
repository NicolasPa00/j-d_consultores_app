/**
 * Humo del componente de agenda (propuesta A, 27-nov-2026): se pinta, propone
 * una franja, «Agregar franja» la escribe en el modelo y el siguiente hueco
 * queda listo; una franja enviada y pasada sale con candado y sin botones.
 */
import { TestBed } from '@angular/core/testing';
import { FranjaVisita } from '../../../core/models';
import { AgendaVisitaComponent } from './agenda-visita';
import { isoFecha, sumarDias } from './franjas';

function montar(franjas: FranjaVisita[] = [], minutosOrden = 15 * 60) {
  const fixture = TestBed.createComponent(AgendaVisitaComponent);
  fixture.componentRef.setInput('profesionalId', 'p1');
  fixture.componentRef.setInput('nombre', 'DANIELA ROSALES');
  fixture.componentRef.setInput('minutosOrden', minutosOrden);
  fixture.componentRef.setInput('franjas', franjas);
  fixture.detectChanges();
  return fixture;
}

describe('AgendaVisitaComponent', () => {
  it('sin profesional pide elegirlo y no ofrece el compositor', () => {
    const fixture = TestBed.createComponent(AgendaVisitaComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Primero elija el profesional');
    expect(el.querySelector('#agv-agregar')).toBeNull();
  });

  it('propone, agrega y vuelve a proponer', () => {
    const fixture = montar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nueva franja de Daniela');
    const boton = el.querySelector<HTMLButtonElement>('#agv-agregar')!;
    expect(boton.disabled).toBe(false);
    boton.click();
    fixture.detectChanges();
    const franjas = fixture.componentInstance.franjas();
    expect(franjas.length).toBe(1);
    // Propuesta: el primer hueco de jornada desde mañana, 8 h como tope.
    expect(franjas[0].hora_inicio).toBe('08:00');
    expect(franjas[0].hora_fin).toBe('16:00');
    expect(el.textContent).toContain('Faltan 7 h');
    expect(el.textContent).toContain('Nueva · sin enviar');
  });

  it('una franja enviada que ya ocurrió lleva candado y no se puede tocar', () => {
    const ayer = sumarDias(isoFecha(new Date()), -1);
    const fixture = montar([
      { id: 'f1', fecha: ayer, hora_inicio: '08:00', hora_fin: '12:00', enviada_en: new Date().toISOString() },
    ]);
    const fila = (fixture.nativeElement as HTMLElement).querySelector('#agv-fila-f1')!;
    expect(fila.textContent).toContain('Ya ocurrió · no se puede cambiar');
    expect(fila.querySelectorAll('button').length).toBe(0);
  });

  it('una franja enviada futura pide confirmación antes de cambiarla', () => {
    const pasado = sumarDias(isoFecha(new Date()), 3);
    const fixture = montar([
      { id: 'f1', fecha: pasado, hora_inicio: '08:00', hora_fin: '12:00', enviada_en: new Date().toISOString() },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('#agv-cambiar-f1')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('ya recibió esta franja');
    el.querySelector<HTMLButtonElement>('#agv-conf-cambiar')!.click();
    fixture.detectChanges();
    // 27-nov · La franja se cambia en el mismo formulario, que pasa a «Cambiar la franja del …».
    expect(el.querySelector('#agv-ini')).not.toBeNull();
    expect(el.textContent).toContain('Cambiar la franja del');
    expect(el.querySelector('#agv-guardar')).not.toBeNull();
  });

  it('«Ver agenda» es de consulta: tocar un rato libre vuelve a «Elegir horario» con el formulario lleno', () => {
    const fixture = montar();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('#agv-tab-agenda')!.click();
    fixture.detectChanges();
    expect(el.querySelector('#agv-agregar')).toBeNull();
    // Una columna de un día futuro (la última de la semana): se simula el toque arriba del todo.
    const cols = el.querySelectorAll<HTMLElement>('.rej__col:not(.rej__col--bloq)');
    const col = cols[cols.length - 1];
    col.getBoundingClientRect = () => ({ top: 0, left: 0, height: 280, width: 100, bottom: 280, right: 100, x: 0, y: 0, toJSON: () => ({}) });
    col.dispatchEvent(new MouseEvent('click', { clientY: 1, bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('#agv-agregar')).not.toBeNull();
    const ini = el.querySelector<HTMLSelectElement>('#agv-ini')!;
    // 6:00 a. m. es el primer rato del mapa.
    expect(ini.value).toBe('360');
    expect(fixture.componentInstance.franjas().length).toBe(0);
  });

  it('en edición, «Esc» cancela y la franja no cambia', () => {
    const fixture = montar([{ id: 'f1', fecha: sumarDias(isoFecha(new Date()), 3), hora_inicio: '08:00', hora_fin: '12:00' }]);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('#agv-editar-f1')!.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('#agv-ini + button')!.click();
    fixture.detectChanges();
    el.querySelector('#agv-comp')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Cambiar la franja del');
    expect(fixture.componentInstance.franjas()[0].hora_inicio).toBe('08:00');
  });
});

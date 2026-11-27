/**
 * Humo del selector de asesor (27-nov-2026, ajuste para pantallas pequeñas): sin
 * asesor se ve la lista; elegido, una fila con «Cambiar» que vuelve a abrirla.
 */
import { TestBed } from '@angular/core/testing';
import { Profesional } from '../../../core/models';
import { AsesorVisitaComponent } from './asesor-visita';

const PROFES: Profesional[] = [
  { id: 'p1', nombre: 'Daniela Rosales', correo: 'd@x.co', estado: 'Activo', especialidad: 'Ergonomía' },
  { id: 'p2', nombre: 'Andrés Benavides', correo: 'a@x.co', estado: 'Activo' },
];

function montar(sel: string | null) {
  const fixture = TestBed.createComponent(AsesorVisitaComponent);
  fixture.componentRef.setInput('todos', PROFES);
  fixture.componentRef.setInput('filtrados', PROFES);
  fixture.componentRef.setInput('seleccionadoId', sel);
  fixture.componentRef.setInput('arl', 'ARL SURA');
  fixture.detectChanges();
  return fixture;
}

describe('AsesorVisitaComponent', () => {
  it('sin asesor muestra la lista y avisa al elegir', () => {
    const fixture = montar(null);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('¿Quién ejecuta la visita?');
    let elegido = '';
    fixture.componentInstance.elegir.subscribe((id) => (elegido = id));
    el.querySelectorAll<HTMLButtonElement>('.tarjeta')[1].click();
    expect(elegido).toBe('p2');
  });

  it('con asesor muestra una fila y «Cambiar» reabre la lista', () => {
    const fixture = montar('p1');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.tarjeta')).toBeNull();
    expect(el.textContent).toContain('Daniela Rosales');
    expect(el.textContent).toContain('Sin registro ante ARL SURA');
    el.querySelector<HTMLButtonElement>('#asv-cambiar')!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.tarjeta').length).toBe(2);
    expect(el.textContent).toContain('Volver a la agenda');
  });
});

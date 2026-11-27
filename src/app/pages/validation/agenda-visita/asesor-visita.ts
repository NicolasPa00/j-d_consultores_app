import { ChangeDetectionStrategy, Component, computed, signal, ElementRef, inject, input, model, output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Profesional, RegistroArl } from '../../../core/models';
import { IconoComponent } from '../../../shared/icono/icono';
import { duracionTexto } from './franjas';
import { MiembroAgenda } from './agenda-visita';

/**
 * ASG · Quién ejecuta la visita, en el modal «Asignar profesional».
 *
 * 27-nov-2026 · Ajuste para pantallas pequeñas: la lista completa de asesores
 * solo hace falta mientras se elige. Sin asesor (o al pulsar «Cambiar» u «Otro
 * asesor») ocupa el cuerpo del modal como un paso propio; con asesor elegido se
 * reduce a una fila («Daniela Rosales · Cambiar»), y la casilla de los formatos a
 * nombre de otro baja a un control en línea. Así la agenda gana todo el alto.
 *
 * El padre sigue siendo dueño de los datos: este componente solo pinta y avisa.
 */
@Component({
  selector: 'app-asesor-visita',
  imports: [IconoComponent],
  templateUrl: './asesor-visita.html',
  styleUrl: './asesor-visita.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsesorVisitaComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Todos los activos (para los nombres) y los que deja el buscador. */
  readonly todos = input<Profesional[]>([]);
  readonly filtrados = input<Profesional[]>([]);
  readonly busqueda = model('');
  readonly seleccionadoId = input<string | null>(null);
  /** Asesores con horas guardadas (varios asesores en la orden). */
  readonly equipo = input<MiembroAgenda[]>([]);
  /** Minutos que lleva cada asesor en esta orden, con lo que está en pantalla. */
  readonly minutosDe = input<(id: string) => number>(() => 0);
  /** ¿Está abierta la lista para elegir? Sin asesor siempre lo está. */
  readonly abierto = model(false);
  /** Horas de la orden, para el título del paso («15 h por repartir»). */
  readonly minutosOrden = input(0);
  /** Se puede repartir la orden entre varios (orden creada y con horas). */
  readonly varios = input(false);

  // ---- Formatos a nombre de otro (ASG · suplente) ----
  readonly arl = input('');
  /** Orden particular: no lleva formatos, no hay suplente. */
  readonly particular = input(false);
  readonly registrado = input<(p: Profesional) => boolean>(() => false);
  readonly usarSuplente = input(false);
  readonly formatosProfId = input<string | null>(null);
  readonly registroSuplente = input<RegistroArl | undefined>(undefined);

  readonly elegir = output<string>();
  readonly quitar = output<string>();
  /** Guarda las horas del actual y abre la lista para sumar a otro. */
  readonly otroAsesor = output<void>();
  readonly suplente = output<boolean>();
  readonly formatosProf = output<string | null>();

  /** La lista se abrió con «Otro asesor» (sumar) y no con «Cambiar» (reemplazar). */
  protected readonly sumando = signal(false);

  protected readonly seleccionado = computed(() => this.todos().find((p) => p.id === this.seleccionadoId()) ?? null);
  /** La lista se ve si se pidió o si todavía no hay nadie. */
  protected readonly eligiendo = computed(() => this.abierto() || !this.seleccionadoId());

  /**
   * Con varios asesores la fila es un chip por asesor (los guardados más el que
   * está en pantalla, si aún no se guardó); con uno solo, su nombre completo.
   */
  protected readonly chips = computed(() => {
    const sel = this.seleccionadoId();
    const eq = this.equipo();
    const ids = eq.map((m) => m.id);
    if (sel && !ids.includes(sel)) ids.push(sel);
    if (ids.length < 2) return [];
    const minutos = this.minutosDe();
    return ids.map((id, i) => ({
      id,
      // Nombre completo, como está en la ficha: dos asesores pueden compartir el primero.
      nombre: this.todos().find((p) => p.id === id)?.nombre ?? eq.find((m) => m.id === id)?.nombre ?? 'Profesional',
      minutos: minutos(id),
      principal: i === 0,
      activo: id === sel,
    }));
  });

  /** Los que pueden firmar los formatos de esta ARL, sin el ejecutor. */
  protected readonly registrados = computed(() => {
    const ok = this.registrado();
    return this.todos().filter((p) => p.id !== this.seleccionadoId() && ok(p));
  });

  protected readonly ejecutorRegistrado = computed(() => {
    const p = this.seleccionado();
    return !!p && this.registrado()(p);
  });

  protected duracion(min: number): string {
    return duracionTexto(min);
  }

  protected inicial(nombre: string): string {
    return (nombre ?? '').trim().charAt(0).toLocaleUpperCase('es-CO');
  }

  protected escoger(id: string): void {
    this.elegir.emit(id);
    this.abierto.set(false);
  }

  protected abrir(sumar = false): void {
    this.sumando.set(sumar);
    this.abierto.set(true);
    this.enfocar('asv-buscar');
  }

  protected sumarOtro(): void {
    this.otroAsesor.emit();
    this.abrir(true);
  }

  protected volver(): void {
    this.abierto.set(false);
    this.busqueda.set('');
    this.enfocar('asv-cambiar');
  }

  /** `Esc` en la lista vuelve a la agenda (si hay a dónde volver). */
  protected tecla(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape' || !this.seleccionadoId()) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.volver();
  }

  protected activarSuplente(): void {
    this.suplente.emit(true);
    this.enfocar('asv-suplente');
  }

  private enfocar(id: string): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`)?.focus());
  }
}

import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EncuestaPublica } from '../../core/models';

/** Etiqueta de cada nota de la escala 1-5 (ENC-03). */
const ESCALA = [
  { valor: 1, label: 'Muy insatisfecho' },
  { valor: 2, label: 'Insatisfecho' },
  { valor: 3, label: 'Neutral' },
  { valor: 4, label: 'Satisfecho' },
  { valor: 5, label: 'Muy satisfecho' },
];

const ESCALA_RECOMENDACION = [
  { valor: 1, label: 'Nunca' },
  { valor: 2, label: 'Poco probable' },
  { valor: 3, label: 'Tal vez' },
  { valor: 4, label: 'Probablemente' },
  { valor: 5, label: 'Sin duda' },
];

/**
 * M8 · Formulario público de satisfacción (ENC-02/03/06). Sin login: el enlace
 * del correo trae el token y eso es toda la credencial.
 *
 * Los enunciados los manda el backend (`encuesta_preguntas`), no van escritos
 * aquí: son configurables y cada encuesta conserva los suyos.
 */
@Component({
  selector: 'app-survey',
  imports: [FormsModule],
  templateUrl: './survey.html',
  styleUrl: './survey.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly escala = ESCALA;
  protected readonly escalaRecomendacion = ESCALA_RECOMENDACION;

  protected readonly info = signal<EncuestaPublica | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly satisfaccion = signal<number | null>(null);
  protected readonly recomendacion = signal<number | null>(null);
  protected comentarios = '';

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.isBrowser) return;
    if (!this.token) {
      this.loading.set(false);
      this.error.set('Enlace inválido: falta el token de la encuesta.');
      return;
    }
    this.api.publicSurvey(this.token).subscribe({
      next: (r) => {
        this.info.set(r.data);
        // ENC-06 · Ya respondida: se muestra el agradecimiento, no el formulario.
        if (r.data.respondida) this.sent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'No se pudo cargar la encuesta.');
      },
    });
  }

  protected elegir(pregunta: 'satisfaccion' | 'recomendacion', valor: number): void {
    if (this.sending()) return;
    (pregunta === 'satisfaccion' ? this.satisfaccion : this.recomendacion).set(valor);
  }

  /** Las dos escalas son obligatorias; el comentario es opcional (ENC-03). */
  protected completo(): boolean {
    return this.satisfaccion() !== null && this.recomendacion() !== null;
  }

  protected enviar(): void {
    if (!this.completo() || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    this.api
      .submitSurvey(this.token, {
        satisfaccion: this.satisfaccion()!,
        recomendacion: this.recomendacion()!,
        comentarios: this.comentarios.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        error: (err) => {
          this.sending.set(false);
          this.error.set(err?.error?.error || 'No se pudo registrar su respuesta.');
        },
      });
  }
}

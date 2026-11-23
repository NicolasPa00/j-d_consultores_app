import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** «0», «0,00», «0.00», «$ 0»…: un importe que vale cero, se escriba como se escriba. */
const CERO = /^\s*\$?\s*0+(?:[.,]0+)?\s*$/;

/**
 * 22-nov-2026 · CERO COMO MARCADOR (pasada del dueño: «hay que borrar el 0 para escribir»).
 *
 * Un campo de importe o cantidad cuyo valor es cero se pinta VACÍO, con «0» de marcador
 * (`placeholder`), y al enfocarlo se selecciona lo que tenga: se escribe encima sin borrar.
 *
 * Es un `ControlValueAccessor` con el mismo selector que los de Angular para `ngModel`
 * (`NumberValueAccessor` en `type=number`, `DefaultValueAccessor` en texto). Angular
 * prefiere un accessor propio a los suyos, así que basta importarlo en el componente:
 * NO hay que tocar cada campo ni cada modelo.
 *
 * Qué cambia y qué no:
 *  - Solo la PANTALLA del cero. El modelo sigue valiendo lo mismo: un 0 que nadie toca se
 *    guarda como 0, y lo que se escribe llega igual que antes (número o `null` en
 *    `type=number`; el texto tal cual en los de texto). Así los totales en vivo y las
 *    validaciones de obligatorios siguen viendo lo mismo que veían: un campo vaciado a
 *    mano ya daba `null`/'' y cada vista lo trata como 0 o como «falta» según su regla.
 *  - Si el campo trae un marcador propio que NO es un cero («Proporcional a los días»,
 *    «Según la liquidación»…), el vacío ya significa otra cosa y el 0 se sigue pintando.
 *  - `conCero` en el input lo excluye.
 *
 * Alcance: `type=number` e `inputmode=decimal` con `ngModel` (importes y cantidades), y
 * cualquier input con el atributo `ceroVacio` (campos de texto `inputmode=numeric` que
 * son importes). Los `inputmode=numeric` sin marcar quedan fuera a propósito: ahí viven
 * documentos, NIT, dígitos de verificación y cuentas, donde «0» es un dato.
 */
@Directive({
  selector:
    'input[type=number][ngModel]:not([conCero]),' +
    'input[inputmode=decimal][ngModel]:not([conCero]),' +
    'input[ceroVacio][ngModel]:not([conCero])',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CeroVacioDirective), multi: true }],
  host: {
    '(input)': 'alEscribir($any($event.target).value)',
    '(blur)': 'alTocar()',
    '(focus)': 'alEnfocar()',
  },
})
export class CeroVacioDirective implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private cambio: (v: unknown) => void = () => {};
  private tocado: () => void = () => {};

  private get esNumero(): boolean {
    return this.el.type === 'number';
  }

  /** ¿El vacío de este campo puede leerse como cero? */
  private get marcadorEsCero(): boolean {
    const p = this.el.getAttribute('placeholder');
    return !p || CERO.test(p);
  }

  writeValue(valor: unknown): void {
    const esCero = valor === 0 || (typeof valor === 'string' && CERO.test(valor));
    if (esCero && this.marcadorEsCero) {
      if (!this.el.getAttribute('placeholder')) this.el.setAttribute('placeholder', '0');
      this.el.value = '';
      return;
    }
    this.el.value = valor == null ? '' : String(valor);
  }

  protected alEscribir(texto: string): void {
    // Igual que los accessors de Angular: número (o null si queda vacío) en type=number.
    this.cambio(this.esNumero ? (texto === '' ? null : parseFloat(texto)) : texto);
  }

  protected alTocar(): void {
    this.tocado();
  }

  /** Se escribe encima de lo que haya. El `setTimeout` gana al clic que coloca el cursor. */
  protected alEnfocar(): void {
    setTimeout(() => {
      if (document.activeElement === this.el) this.el.select();
    });
  }

  registerOnChange(fn: (v: unknown) => void): void {
    this.cambio = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.tocado = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.el.disabled = deshabilitado;
  }
}

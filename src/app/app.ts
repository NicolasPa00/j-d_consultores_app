import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertHostComponent } from './shared/alert-host/alert-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AlertHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('JD&D Consultores · Gestión de Órdenes de Servicio');
}

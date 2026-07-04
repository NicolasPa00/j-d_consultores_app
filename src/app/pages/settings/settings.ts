import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface RateRow {
  activity: string;
  rate: number;
}

type Tab = 'profile' | 'system';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  protected readonly activeTab = signal<Tab>('profile');

  // ----- Pestaña: Mi perfil corporativo (ngModel) -----
  protected fullName = 'Soporte JD&D';
  protected email = 'soporte@jddconsultores.com';
  protected phone = '+57 300 123 4567';
  protected specialty = 'Seguridad y Salud en el Trabajo';
  protected password = '';

  // ----- Pestaña: Preferencias del sistema -----
  protected rates: RateRow[] = [
    { activity: 'Capacitación', rate: 85000 },
    { activity: 'Asesoría', rate: 120000 },
    { activity: 'Inspección', rate: 95000 },
  ];

  protected whatsappEnabled = false;

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  /** Iniciales para el avatar grande. */
  protected get initials(): string {
    return this.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}

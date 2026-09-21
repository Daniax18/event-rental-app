import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { IconComponent } from './icon';
import { MENUS } from './menus';
import { EquipmentStore } from './equipment/equipment.store';
import { ClientsStore } from './clients/clients.store';
import { RentalsStore } from './rentals/rentals.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(EquipmentStore);
    inject(ClientsStore);
    inject(RentalsStore);
  }
  private readonly router = inject(Router);
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );
  readonly menus = MENUS;
  readonly expanded = signal(false);
  readonly openPanel = signal<'notifications' | 'profile' | null>(null);
  readonly currentTitle = computed(() => {
    this.navigation();
    return (
      this.menus.find((menu) => this.router.url.split('?')[0] === menu.path)?.title ?? 'Accueil'
    );
  });
  togglePanel(panel: 'notifications' | 'profile') {
    this.openPanel.update((current) => (current === panel ? null : panel));
  }
  logout() {
    localStorage.clear();
    this.closePanel();
  }
  @HostListener('document:keydown.escape') closePanel() {
    this.openPanel.set(null);
  }
  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent) {
    if (!(event.target as Element).closest('.popover-wrapper')) this.closePanel();
  }
}

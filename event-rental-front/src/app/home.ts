import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon';
import { MENUS } from './menus';

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent],
  template: `
    <section class="welcome">
      <p>BIENVENUE DANS VOTRE ESPACE</p>
      <h1>Que souhaitez-vous faire ?</h1>
    </section>
    <nav class="menu-grid" aria-label="Espaces de gestion">
      @for (menu of menus; track menu.path) {
        <a [class]="'menu-card ' + menu.theme" [routerLink]="menu.path">
          <app-icon [name]="menu.icon" />
          <div>
            <h2>{{ menu.title }}</h2>
            <p>{{ menu.description }}</p>
          </div>
        </a>
      }
    </nav>
  `,
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly menus = MENUS;
}

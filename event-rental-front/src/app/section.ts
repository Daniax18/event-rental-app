import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from './icon';
import { MENUS } from './menus';

@Component({
  selector: 'app-section',
  imports: [RouterLink, IconComponent],
  template: `<section class="section-page">
    <a routerLink="/" class="back-link">← Retour à l’accueil</a>
    <div class="eyebrow">VOTRE ESPACE DE GESTION</div>
    <h1>{{ menu.title }}</h1>
    <div class="empty-state">
      <span class="empty-icon"><app-icon [name]="menu.icon" /></span
      ><span class="coming-soon">BIENTÔT DISPONIBLE</span>
      <h2>{{ menu.empty }}</h2>
      <p>{{ menu.detail }}</p>
      <a routerLink="/" class="primary-link">Revenir à mes espaces <app-icon name="arrow" /></a>
    </div>
  </section>`,
  styles: [
    `
      .section-page {
        max-width: 1100px;
        margin: auto;
        padding: 48px 36px;
      }
      .back-link {
        font-size: 13px;
        color: #797575;
        text-decoration: none;
      }
      .eyebrow {
        margin-top: 48px;
        color: #8b3b4b;
        font-size: 10px;
        letter-spacing: 2px;
        font-weight: 700;
      }
      h1 {
        font-size: 40px;
        letter-spacing: -1.5px;
        margin: 14px 0 32px;
      }
      .empty-state {
        text-align: center;
        background: #fff;
        border: 1px solid #eae6e2;
        border-radius: 20px;
        padding: 64px 24px;
      }
      .empty-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 70px;
        height: 70px;
        background: #f6eded;
        border-radius: 20px;
        margin: 0 auto 24px;
        color: #873749;
      }
      .empty-icon app-icon {
        width: 32px;
        height: 32px;
      }
      .coming-soon {
        font-size: 10px;
        letter-spacing: 2px;
        color: #8d7f75;
      }
      h2 {
        font-size: 26px;
        letter-spacing: -0.7px;
      }
      p {
        max-width: 530px;
        margin: 0 auto;
        color: #837c77;
        line-height: 1.8;
        font-size: 14px;
      }
      .primary-link {
        display: inline-flex;
        align-items: center;
        gap: 20px;
        margin-top: 30px;
        padding: 13px 20px;
        border-radius: 8px;
        background: #793449;
        color: white;
        text-decoration: none;
        font-size: 13px;
      }
      @media (max-width: 600px) {
        .section-page {
          padding: 32px 20px;
        }
        h1 {
          font-size: 32px;
        }
        .empty-state {
          padding: 40px 20px;
        }
      }
    `,
  ],
})
export class SectionComponent {
  private readonly route = inject(ActivatedRoute);
  readonly menu =
    MENUS.find((menu) => menu.path === '/' + this.route.snapshot.routeConfig?.path) ?? MENUS[0];
}

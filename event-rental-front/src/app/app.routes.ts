import { Routes } from '@angular/router';
import { HomeComponent } from './home';
import { DashboardComponent } from './dashboard/dashboard';
import { SectionComponent } from './section';
import { MENUS } from './menus';

export const routes: Routes = [
  { path: 'tableau-de-bord', component: DashboardComponent, title: 'Tableau de bord' },
  { path: '', component: HomeComponent, title: 'Accueil · Enventory' },
  {
    path: 'materiels',
    loadComponent: () =>
      import('./equipment/equipment').then((module) => module.EquipmentComponent),
    title: 'Matériels · Enventory',
  },
  {
    path: 'clients',
    loadComponent: () => import('./clients/clients').then((module) => module.ClientsComponent),
    title: 'Clients · Enventory',
  },
  {
    path: 'factures/:id',
    loadComponent: () =>
      import('./rentals/rental-invoice').then((module) => module.RentalInvoiceComponent),
    title: 'Facture · Enventory',
  },
  {
    path: 'locations',
    loadComponent: () => import('./rentals/rentals').then((module) => module.RentalsComponent),
    title: 'Locations · Enventory',
  },
  ...MENUS.filter(
    (menu) => menu.path !== '/materiels' && menu.path !== '/clients' && menu.path !== '/locations',
  ).map((menu) => ({
    path: menu.path.slice(1),
    component: SectionComponent,
    title: `${menu.title} · Enventory`,
  })),
  { path: '**', redirectTo: '' },
];

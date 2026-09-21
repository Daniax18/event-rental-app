import { Routes } from '@angular/router';
import { HomeComponent } from './home';
import { SectionComponent } from './section';
import { MENUS } from './menus';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Accueil · Mahenintsoa Events' },
  {
    path: 'materiels',
    loadComponent: () =>
      import('./equipment/equipment').then((module) => module.EquipmentComponent),
    title: 'Matériels · Mahenintsoa Events',
  },
  {
    path: 'clients',
    loadComponent: () => import('./clients/clients').then((module) => module.ClientsComponent),
    title: 'Clients · Mahenintsoa Events',
  },
  {
    path: 'factures/:id',
    loadComponent: () =>
      import('./rentals/rental-invoice').then((module) => module.RentalInvoiceComponent),
    title: 'Facture · Mahenintsoa Events',
  },
  {
    path: 'locations',
    loadComponent: () => import('./rentals/rentals').then((module) => module.RentalsComponent),
    title: 'Locations · Mahenintsoa Events',
  },
  ...MENUS.filter(
    (menu) => menu.path !== '/materiels' && menu.path !== '/clients' && menu.path !== '/locations',
  ).map((menu) => ({
    path: menu.path.slice(1),
    component: SectionComponent,
    title: `${menu.title} · Mahenintsoa Events`,
  })),
  { path: '**', redirectTo: '' },
];

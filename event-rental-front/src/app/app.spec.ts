import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { MENUS } from './menus';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });
  afterEach(() => localStorage.clear());

  it('initializes local data at startup and clears only storage on logout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.equipment.v2')!)).toHaveLength(43);
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.categories.v1')!)).toHaveLength(8);
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.clients.v1')!)).toHaveLength(7);
    const rentals = JSON.parse(localStorage.getItem('mahenintsoa-events.rentals.v1')!);
    expect(rentals).toHaveLength(5);
    expect(rentals.map((rental: { numeroFacture: string }) => rental.numeroFacture)).toEqual([
      'FAC-2026-0001',
      'FAC-2026-0002',
      'FAC-2026-0003',
      'FAC-2026-0004',
      'FAC-2026-0005',
    ]);
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.rental-items.v1')!)).toHaveLength(
      10,
    );
    const router = TestBed.inject(Router);
    const url = router.url;
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.profile')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.logout-button')!.click();
    await fixture.whenStable();
    expect(localStorage.length).toBe(0);
    expect(router.url).toBe(url);
    expect(compiled.querySelector('.profile-menu')).toBeNull();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('opens on the four menus with the sidebar collapsed and allows expansion', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.menu-card')).toHaveLength(4);
    expect(compiled.querySelector('.app-shell')?.classList.contains('expanded')).toBe(false);
    const toggle = compiled.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(compiled.querySelector('.app-shell')?.classList.contains('expanded')).toBe(true);
  });

  it('navigates to every section and updates the active menu and breadcrumb', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    for (const menu of MENUS) {
      await router.navigateByUrl(menu.path);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('h1')?.textContent).toBe(menu.title);
      expect(compiled.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe(
        menu.path,
      );
      expect(compiled.querySelector('.breadcrumb strong')?.textContent).toBe(menu.title);
    }
  });

  it('opens notifications and dismisses them with Escape', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.notification-button')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.notifications')?.textContent).toContain('Vous êtes à jour');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(compiled.querySelector('.notifications')).toBeNull();
  });
});

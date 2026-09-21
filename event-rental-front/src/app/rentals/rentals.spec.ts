import { TestBed } from '@angular/core/testing';
import { RentalsComponent } from './rentals';
import { RentalsStore } from './rentals.store';
import { ClientsStore } from '../clients/clients.store';

describe('Rentals', () => {
  function draft() {
    const component = TestBed.createComponent(RentalsComponent).componentInstance;
    component.newRental();
    component.client = {
      nomOuRaisonSociale: 'Nouveau client',
      telephone: '0321234567',
      cin: '123456789012',
      adresse: 'Antananarivo',
      nif: '',
      stat: '',
    };
    component.deliveryDate.set('2026-10-01');
    component.returnDate.set('2026-10-03');
    component.days.set(2);
    component.selectEquipment(1);
    component.quantity.set(3);
    component.addLine();
    return component;
  }

  it('persists a new client, rental and linked items across store reloads', () => {
    const component = draft();
    const clientCount = component.clientsStore.clients().length;
    component.saveRental();
    expect(component.saveError()).toBe('');
    expect(component.view()).toBe('create');
    expect(component.saveMessage()).toContain('enregistrée');
    const clients = new ClientsStore().clients();
    const store = new RentalsStore();
    const rental = store.rentals()[0];
    expect(component.activeRental()?.id).toBe(rental.id);
    expect(clients).toHaveLength(clientCount + 1);
    expect(clients.find((client) => client.id === rental.clientId)?.nomOuRaisonSociale).toBe(
      'Nouveau client',
    );
    expect(rental.statut).toBe('Confirmé');
    expect(store.rentalItems().filter((item) => item.rentalId === rental.id)).toEqual([
      expect.objectContaining({ materielId: 1, qty: 3, nombreJour: 2, total: rental.prixTotal }),
    ]);
    component.saveRental();
    expect(component.rentalsStore.rentals()).toHaveLength(store.rentals().length);
  });

  it('uses the selected client ID without changing the client record', () => {
    const component = draft();
    const existing = component.clientsStore.clients().find((client) => client.cin)!;
    const before = JSON.stringify(component.clientsStore.clients());
    component.selectClient(existing);
    component.client.adresse = 'Adresse saisie';
    component.saveRental();
    expect(component.rentalsStore.rentals()[0].clientId).toBe(existing.id);
    expect(JSON.stringify(component.clientsStore.clients())).toBe(before);
  });

  it('matches an existing client by phone and blocks incomplete rentals', () => {
    const component = draft();
    const existing = component.clientsStore.clients()[0];
    component.searchClient(existing.telephone.replace(/\D/g, ''));
    const count = component.clientsStore.clients().length;
    component.saveRental();
    expect(component.rentalsStore.rentals()[0].clientId).toBe(existing.id);
    expect(component.clientsStore.clients()).toHaveLength(count);
    component.newRental();
    const before = JSON.stringify(localStorage);
    component.saveRental();
    expect(JSON.stringify(localStorage)).toBe(before);
    expect(component.validationAttempted()).toBe(true);
    expect(component.view()).toBe('create');
  });

  it('restores items on storage failure and retries without duplicating the new client', () => {
    const component = draft();
    const beforeItems = localStorage.getItem('mahenintsoa-events.rental-items.v1');
    const count = component.rentalsStore.rentals().length;
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === 'mahenintsoa-events.rentals.v1') throw new Error('Quota exceeded');
      original.call(this, key, value);
    });
    try {
      component.saveRental();
      expect(component.saveError()).toBeTruthy();
      expect(component.view()).toBe('create');
      expect(component.rentalsStore.rentals()).toHaveLength(count);
      expect(localStorage.getItem('mahenintsoa-events.rental-items.v1')).toBe(beforeItems);
    } finally {
      spy.mockRestore();
    }
    const clientCount = component.clientsStore.clients().length;
    component.saveRental();
    expect(component.saveError()).toBe('');
    expect(component.clientsStore.clients()).toHaveLength(clientCount);
    expect(component.rentalsStore.rentals()).toHaveLength(count + 1);
  });
  it('searches category and designation and clears stale prices when typing another item', () => {
    const component = TestBed.createComponent(RentalsComponent).componentInstance;
    component.searchEquipment('napoleon');
    expect(component.equipmentMatches()).toHaveLength(2);
    component.searchEquipment('chapiteaux');
    expect(component.equipmentMatches()).toHaveLength(2);
    const item = component.equipmentMatches()[0];
    const label = component.equipmentLabel(item);
    expect(label).toBe('Chapiteaux - Chapiteaux 3 x 3');
    component.searchEquipment(label);
    expect(component.equipmentId()).toBe(item.id);
    expect(component.unitPrice()).toBe(item.price);
    component.searchEquipment('introuvable');
    expect(component.equipmentMatches()).toHaveLength(0);
    expect(component.equipmentId()).toBeNull();
    expect(component.unitPrice()).toBeNull();
    expect(component.validDraft()).toBe(false);
  });

  it('searches directly in the phone field and fills the selected client', async () => {
    const fixture = TestBed.createComponent(RentalsComponent);
    fixture.componentInstance.view.set('create');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#rental-client-search')).toBeNull();
    const phone = root.querySelector<HTMLInputElement>('#rental-client-telephone')!;
    phone.value = '0344455566';
    phone.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.client.telephone).toBe('0344455566');
    root.querySelector<HTMLButtonElement>('.client-results button')!.click();
    await fixture.whenStable();
    expect(phone.value).toBe('034 44 555 66');
    expect(root.querySelector<HTMLInputElement>('#rental-client-nomOuRaisonSociale')!.value).toBe(
      'Mada Réception',
    );
    expect(root.querySelector('.client-results')).toBeNull();
    phone.value = '';
    phone.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.client.telephone).toBe('');
    expect(root.querySelector('.client-results')).toBeNull();
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [RentalsComponent] });
  });
  afterEach(() => localStorage.clear());

  it('opens on the five stored rentals and resolves their client names', async () => {
    const fixture = TestBed.createComponent(RentalsComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.view()).toBe('list');
    expect(root.querySelectorAll('.rental-list tbody tr')).toHaveLength(5);
    expect(root.querySelector('.rental-list tbody')?.textContent).toContain('FAC-2026-0001');
    expect(root.querySelector('.rental-list tbody')?.textContent).toContain('Rakotoarisoa Mialy');
    expect(root.querySelector('.rental-list tbody')?.textContent).toContain('680 000 Ar');
    expect(root.querySelector('.rental-list tbody')?.textContent).toContain('Confirmé');
    expect(fixture.componentInstance.pageCount()).toBe(1);
    expect(fixture.componentInstance.visibleRentals()).toHaveLength(5);
    expect(root.querySelectorAll('.rental-list button[title="Voir"]')).toHaveLength(5);
    expect(root.querySelectorAll('.rental-list button[title="Modifier"]')).toHaveLength(3);
    root.querySelector<HTMLButtonElement>('.rental-list button[title="Voir"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.view()).toBe('create');
    expect(root.querySelector<HTMLInputElement>('#rental-client-nomOuRaisonSociale')?.value).toBe(
      'Rakotoarisoa Mialy',
    );
    expect(root.querySelector<HTMLInputElement>('#rental-delivery')?.value).toBe('2026-09-25');
    expect(fixture.componentInstance.lines()).toHaveLength(2);
    root.querySelector<HTMLButtonElement>('.page-actions button')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('#create-rental')!.click();
    await fixture.whenStable();
    expect(root.querySelector('#rental-client-telephone')).not.toBeNull();
    expect(root.querySelector('.rental-list')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('#rental-client-nomOuRaisonSociale')?.value).toBe(
      '',
    );
    expect(fixture.componentInstance.lines()).toHaveLength(0);
  });

  it('finds clients by phone and fills every field without changing the stored client', () => {
    const component = TestBed.createComponent(RentalsComponent).componentInstance;
    component.searchClient('034-44-555-66');
    expect(component.clientMatches()).toHaveLength(1);
    const client = component.clientMatches()[0];
    component.selectClient(client);
    expect(component.client).toEqual({
      nomOuRaisonSociale: client.nomOuRaisonSociale,
      telephone: client.telephone,
      adresse: client.adresse,
      cin: '',
      nif: client.nif,
      stat: client.stat,
    });
    component.client.nomOuRaisonSociale = 'Changed';
    expect(
      component.clientsStore.clients().find((item) => item.id === client.id)?.nomOuRaisonSociale,
    ).toBe(client.nomOuRaisonSociale);
    component.selectClient(component.clientsStore.clients()[0]);
    expect(component.client.nif).toBe('');
    expect(component.client.stat).toBe('');
    component.searchClient('999999');
    expect(component.clientMatches()).toEqual([]);
  });

  it('prefills prices, accepts overrides and recalculates all totals', () => {
    const component = TestBed.createComponent(RentalsComponent).componentInstance;
    component.selectEquipment(1);
    expect(component.unitPrice()).toBe(5000);
    component.unitPrice.set(4500);
    component.quantity.set(3);
    component.days.set(2);
    expect(component.draftDaily()).toBe(13500);
    expect(component.draftTotal()).toBe(27000);
    component.addLine();
    expect(component.lines()[0].reimbursement).toBe(150000);
    expect(component.total()).toBe(27000);
    expect(component.deposit()).toBe(13500);
    component.advance.set(7000);
    expect(component.remaining()).toBe(33500);
    component.days.set(3);
    expect(component.total()).toBe(40500);
    expect(component.remaining()).toBe(53750);
    component.selectEquipment(3);
    component.quantity.set(2);
    component.addLine();
    expect(component.total()).toBe(49500);
    component.removeLine(component.lines()[0].id);
    expect(component.total()).toBe(9000);
    expect(component.deposit()).toBe(4500);
    expect(component.remaining()).toBe(6500);
    component.advance.set(12000);
    expect(component.advanceError()).toBe('');
    expect(component.remaining()).toBe(1500);
    component.advance.set(13500);
    expect(component.remaining()).toBe(0);
    component.advance.set(13501);
    expect(component.advanceError()).toContain('dépasser');
    expect(component.equipmentStore.equipment()[0].price).toBe(5000);
  });

  it('rejects invalid quantities, prices and days and reports inconsistent dates or advance', () => {
    const component = TestBed.createComponent(RentalsComponent).componentInstance;
    component.addLine();
    expect(component.lines()).toHaveLength(0);
    component.selectEquipment(1);
    for (const quantity of [null, 0, -1, 1.5, Infinity]) {
      component.quantity.set(quantity);
      component.addLine();
    }
    expect(component.lines()).toHaveLength(0);
    component.quantity.set(1);
    component.unitPrice.set(-1);
    expect(component.validDraft()).toBe(false);
    component.unitPrice.set(0);
    expect(component.validDraft()).toBe(true);
    component.days.set(0);
    expect(component.validDraft()).toBe(false);
    component.deliveryDate.set('2026-10-02');
    component.returnDate.set('2026-10-01');
    expect(component.dateError()).toBeTruthy();
    component.returnDate.set('2026-10-02');
    expect(component.dateError()).toBe('');
    component.advance.set(-1);
    expect(component.advanceError()).toBeTruthy();
    component.advance.set(1);
    expect(component.advanceError()).toContain('dépasser');
  });

  it('applies item actions according to the rental status', async () => {
    const fixture = TestBed.createComponent(RentalsComponent);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.viewRental(
      component.rentalsStore.rentals().find((rental) => rental.statut === 'Confirmé')!,
    );
    await fixture.whenStable();
    expect(component.canAddItems()).toBe(true);
    expect(component.canRemoveItems()).toBe(true);
    expect(root.querySelector('.item-form')).not.toBeNull();
    expect(root.querySelectorAll('.items-card button[title="Retirer"]')).toHaveLength(2);

    component.viewRental(
      component.rentalsStore.rentals().find((rental) => rental.statut === 'En cours')!,
    );
    await fixture.whenStable();
    const ongoingLineCount = component.lines().length;
    component.removeLine(component.lines()[0].id);
    expect(component.lines()).toHaveLength(ongoingLineCount);
    expect(root.querySelector('.item-form')).not.toBeNull();
    expect(root.querySelector('.items-card button[title="Retirer"]')).toBeNull();

    component.viewRental(
      component.rentalsStore.rentals().find((rental) => rental.statut === 'Retour Caution')!,
    );
    await fixture.whenStable();
    expect(component.canAddItems()).toBe(false);
    expect(component.canRemoveItems()).toBe(false);
    expect(root.querySelector('.item-form')).toBeNull();
    expect(root.querySelector('.items-card button[title="Retirer"]')).toBeNull();

    component.viewRental(
      component.rentalsStore.rentals().find((rental) => rental.statut === 'Terminé')!,
    );
    await fixture.whenStable();
    expect(root.querySelector('.item-form')).toBeNull();
    expect(root.querySelector('.items-card button[title="Retirer"]')).toBeNull();
  });

  it('adds items through the form and leaves Enregistrer without side effects', async () => {
    const fixture = TestBed.createComponent(RentalsComponent);
    fixture.componentInstance.view.set('create');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    component.selectEquipment(1);
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('.item-form button')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')!.textContent).toContain('150');
    expect(component.lines()).toHaveLength(1);
    const before = JSON.stringify(localStorage);
    root.querySelector<HTMLButtonElement>('#save-rental')!.click();
    await fixture.whenStable();
    expect(JSON.stringify(localStorage)).toBe(before);
    expect(component.lines()).toHaveLength(1);
  });
});

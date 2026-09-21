import { TestBed } from '@angular/core/testing';
import { ClientsComponent } from './clients';
import { ClientsStore } from './clients.store';
import { INITIAL_CLIENTS } from './clients.data';

describe('Clients', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ClientsComponent] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('displays and persists the seven supplied clients', async () => {
    const fixture = TestBed.createComponent(ClientsComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(new ClientsStore().clients()).toEqual(INITIAL_CLIENTS);
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.clients.v1')!)).toEqual(
      INITIAL_CLIENTS,
    );
  });

  it('creates, reloads and edits clients, preserving leading zeroes and null fields', () => {
    const component = TestBed.createComponent(ClientsComponent).componentInstance;
    component.open('create');
    component.form.setValue({
      nomOuRaisonSociale: ' Test client ',
      telephone: '034 00 000 00',
      adresse: 'Tana',
      cin: '001234567890',
      nif: '',
      stat: '',
    });
    component.save();
    expect(component.mode()).toBe('view');
    expect(component.selected()).toMatchObject({
      id: 8,
      nomOuRaisonSociale: 'Test client',
      cin: '001234567890',
      nif: null,
      stat: null,
    });
    expect(new ClientsStore().clients()[0]).toEqual(component.selected());
    component.open('edit', component.selected()!);
    component.form.patchValue({ adresse: 'Ivato' });
    component.save();
    expect(new ClientsStore().clients()[0]).toMatchObject({ id: 8, adresse: 'Ivato' });
    expect(component.store.clients()).toHaveLength(8);
  });

  it('filters all fields without accents and paginates at ten clients', async () => {
    const fixture = TestBed.createComponent(ClientsComponent);
    const component = fixture.componentInstance;
    for (const [field, query] of [
      ['nomOuRaisonSociale', 'reception'],
      ['telephone', '0344455566'],
      ['adresse', 'Andraharo'],
      ['nif', '4007654321'],
      ['stat', '56210-11-2023'],
    ] as const) {
      component.resetFilters();
      component.filter(field, query);
      expect(component.visibleItems().map((item) => item.id)).toEqual([7]);
    }
    component.resetFilters();
    component.filter('cin', '101251234567');
    expect(component.visibleItems().map((item) => item.id)).toEqual([1]);
    component.resetFilters();
    for (let index = 0; index < 5; index++) {
      component.store.save({ ...INITIAL_CLIENTS[0], nomOuRaisonSociale: 'Client ' + index });
    }
    expect(component.visibleItems()).toHaveLength(10);
    component.goToPage(2);
    expect(component.visibleItems()).toHaveLength(2);
    component.filter('nomOuRaisonSociale', 'introuvable');
    expect(component.page()).toBe(1);
    expect(component.firstItem()).toBe(0);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Aucun client trouvé.');
  });

  it('combines separate filters and resets them from the listing', async () => {
    const fixture = TestBed.createComponent(ClientsComponent);
    const component = fixture.componentInstance;
    component.filtersVisible.set(true);
    await fixture.whenStable();
    const inputs = fixture.nativeElement.querySelectorAll(
      '#client-filters input',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(6);
    const enter = (index: number, value: string) => {
      inputs[index].value = value;
      inputs[index].dispatchEvent(new Event('input'));
    };
    enter(1, '034');
    expect(component.filtered()).toHaveLength(3);
    enter(2, 'andraharo');
    expect(component.filtered().map((item) => item.id)).toEqual([7]);
    enter(0, 'Andraharo');
    expect(component.filtered()).toHaveLength(0);
    expect(component.hasFilters()).toBe(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('#client-filters button').click();
    await fixture.whenStable();
    expect(component.filtered()).toHaveLength(7);
    expect(component.hasFilters()).toBe(false);
    expect(Array.from(inputs).every((input) => input.value === '')).toBe(true);
  });

  it('rejects empty required fields and cancels edits without saving', () => {
    const component = TestBed.createComponent(ClientsComponent).componentInstance;
    component.open('create');
    component.form.patchValue({ nomOuRaisonSociale: '  ' });
    component.save();
    expect(component.form.invalid).toBe(true);
    expect(component.store.clients()).toHaveLength(7);
    component.open('edit', component.store.clients()[0]);
    component.form.patchValue({ nomOuRaisonSociale: 'Changed' });
    component.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.close();
    expect(component.mode()).toBe('edit');
    confirm.mockReturnValue(true);
    component.close();
    expect(component.mode()).toBeNull();
    expect(new ClientsStore().clients()).toEqual(INITIAL_CLIENTS);
  });

  it('keeps detail read-only', async () => {
    const fixture = TestBed.createComponent(ClientsComponent);
    fixture.componentInstance.open('view', INITIAL_CLIENTS[0]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.editor form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.editor').textContent).toContain(
      'Rakotoarisoa Mialy',
    );
  });

  it('preserves corrupt storage and reports storage write failures without changing clients', () => {
    localStorage.setItem('mahenintsoa-events.clients.v1', '{broken');
    const store = new ClientsStore();
    expect(store.storageMessage()).toBeTruthy();
    expect(localStorage.getItem('mahenintsoa-events.clients.v1')).toBe('{broken');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(() => store.save(INITIAL_CLIENTS[0])).toThrow('Enregistrement impossible');
    expect(store.clients()).toEqual(INITIAL_CLIENTS);
  });

  it('updates old sample addresses while preserving custom addresses and added clients', () => {
    const custom = { ...INITIAL_CLIENTS[1], adresse: 'Lot personnel 42, Ivato' };
    const added = { ...INITIAL_CLIENTS[0], id: 8, adresse: 'Analakely, Antananarivo' };
    localStorage.setItem(
      'mahenintsoa-events.clients.v1',
      JSON.stringify([
        { ...INITIAL_CLIENTS[0], adresse: 'Analakely, Antananarivo' },
        custom,
        added,
      ]),
    );
    const expected = [INITIAL_CLIENTS[0], custom, added];
    expect(new ClientsStore().clients()).toEqual(expected);
    expect(JSON.parse(localStorage.getItem('mahenintsoa-events.clients.v1')!)).toEqual(expected);
  });

  it('retains an intentionally empty saved list', () => {
    localStorage.setItem('mahenintsoa-events.clients.v1', '[]');
    expect(new ClientsStore().clients()).toEqual([]);
  });
});

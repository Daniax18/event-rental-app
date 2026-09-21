import { TestBed } from '@angular/core/testing';
import { EquipmentComponent } from './equipment';
import { EquipmentStore } from './equipment.store';
import { EQUIPMENT_CATEGORIES, INITIAL_EQUIPMENT } from './equipment.data';

describe('Equipment', () => {
  it('adds chapiteaux to existing storage without overwriting occupied ids or codes', () => {
    const custom = { ...INITIAL_EQUIPMENT[0], id: 42, code: 'MAT-042', designation: 'Personnel' };
    localStorage.setItem(
      'mahenintsoa-events.categories.v1',
      JSON.stringify([
        ...EQUIPMENT_CATEGORIES.filter((category) => category.id !== 8),
        { id: 8, name: 'Autre catégorie', color: '#123456' },
      ]),
    );
    localStorage.setItem(
      'mahenintsoa-events.equipment.v2',
      JSON.stringify([...INITIAL_EQUIPMENT.filter((item) => item.id < 42), custom]),
    );
    const store = new EquipmentStore();
    const category = store.categories.find((item) => item.name === 'Chapiteaux')!;
    expect(category.id).toBe(9);
    expect(store.equipment()).toContainEqual(custom);
    expect(
      store
        .equipment()
        .filter((item) => item.categoryId === category.id)
        .map((item) => item.designation),
    ).toEqual(['Chapiteaux 3 x 3', 'Pagode 3 x 6']);
    expect(new Set(store.equipment().map((item) => item.code)).size).toBe(44);
    expect(new EquipmentStore().equipment()).toEqual(store.equipment());
    expect(new EquipmentStore().categories).toEqual(store.categories);
  });

  it('persists new categories and equipment assigned to them across reloads', () => {
    localStorage.clear();
    const store = new EquipmentStore();
    const category = store.createCategory('Chapiteau', '#aabbcc');
    expect(category.id).toBe(9);
    expect(() => store.createCategory(' chapiteau ', '#aabbcc')).toThrow('existe déjà');
    expect(() => store.createCategory('  ', '#aabbcc')).toThrow('Renseignez');
    expect(() => store.createCategory('Test', 'invalid')).toThrow('couleur valide');
    store.save({
      code: 'MAT-044',
      designation: 'Chapiteau blanc',
      categoryId: category.id,
      price: 1000,
      reimbursement: 5000,
      photo: null,
    });
    const reloaded = new EquipmentStore();
    expect(reloaded.categories).toContainEqual(category);
    expect(reloaded.equipment()).toHaveLength(44);
    expect(reloaded.equipment()[0].categoryId).toBe(category.id);
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [EquipmentComponent] });
  });
  afterEach(() => localStorage.clear());

  it('displays the 43 supplied items over five pages of at most 10', async () => {
    const fixture = TestBed.createComponent(EquipmentComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.store.equipment()).toHaveLength(43);
    expect(component.store.categories).toHaveLength(8);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(component.pageCount()).toBe(5);
    component.goToPage(2);
    expect(component.visibleItems()[0].id).toBe(11);
    expect(component.visibleItems()).toHaveLength(10);
    component.goToPage(5);
    expect(component.visibleItems()).toHaveLength(3);
    expect(component.visibleItems()[0].id).toBe(41);
    component.filter('napoleon', '1');
    expect(component.page()).toBe(1);
    expect(component.visibleItems()).toHaveLength(2);
    component.filter('introuvable', '');
    expect(component.visibleItems()).toHaveLength(0);
    expect(component.firstItem()).toBe(0);
  });

  it('creates, reloads and updates equipment without changing its id', () => {
    const component = TestBed.createComponent(EquipmentComponent).componentInstance;
    component.open('create');
    component.form.setValue({
      code: 'MAT-044',
      designation: 'Table test',
      categoryId: 2,
      price: 1000,
      reimbursement: 15000,
    });
    component.save();
    expect(component.mode()).toBe('view');
    expect(component.selected()?.id).toBe(44);
    expect(new EquipmentStore().equipment()[0].designation).toBe('Table test');
    component.open('edit', component.selected()!);
    component.form.patchValue({ designation: 'Table modifiée', price: 2000 });
    component.save();
    expect(component.selected()?.id).toBe(44);
    expect(component.store.equipment()).toHaveLength(44);
    expect(new EquipmentStore().equipment()[0].price).toBe(2000);
  });

  it('rejects empty forms, duplicate codes and negative prices', () => {
    const component = TestBed.createComponent(EquipmentComponent).componentInstance;
    component.open('create');
    component.save();
    expect(component.store.equipment()).toHaveLength(43);
    component.form.setValue({
      code: 'mat-001',
      designation: 'Test',
      categoryId: 1,
      price: 100,
      reimbursement: 0,
    });
    component.save();
    expect(component.error()).toContain('déjà utilisé');
    component.form.patchValue({ code: 'MAT-044', price: -1 });
    component.save();
    expect(component.form.invalid).toBe(true);
    expect(component.store.equipment()).toHaveLength(43);
  });

  it('keeps viewing read-only and cancels changes without saving', async () => {
    const fixture = TestBed.createComponent(EquipmentComponent);
    const component = fixture.componentInstance;
    const original = component.store.equipment()[0];
    component.open('view', original);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.editor form')).toBeNull();
    component.open('edit', original);
    component.form.patchValue({ designation: 'Not saved' });
    component.close();
    expect(component.store.equipment()[0].designation).toBe(original.designation);
  });

  it('does not report success or mutate data when browser storage is full', () => {
    const store = TestBed.inject(EquipmentStore);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(() =>
      store.save({
        code: 'MAT-044',
        designation: 'Test',
        categoryId: 1,
        price: 0,
        reimbursement: 0,
        photo: null,
      }),
    ).toThrow('Enregistrement impossible');
    expect(store.equipment()).toHaveLength(43);
    spy.mockRestore();
  });
});

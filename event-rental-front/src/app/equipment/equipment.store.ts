import { Injectable, signal } from '@angular/core';
import { EQUIPMENT_CATEGORIES, INITIAL_EQUIPMENT } from './equipment.data';
import { Equipment, EquipmentInput, EquipmentCategory } from './equipment.model';

@Injectable({ providedIn: 'root' })
export class EquipmentStore {
  private readonly storageKey = 'mahenintsoa-events.equipment.v2';
  readonly storageMessage = signal('');
  private readonly categoryItems = signal<EquipmentCategory[]>(this.loadCategories());
  private readonly items = signal<Equipment[]>(this.load());
  readonly equipment = this.items.asReadonly();
  get categories() {
    return this.categoryItems();
  }

  private loadCategories(): EquipmentCategory[] {
    try {
      const saved = localStorage.getItem('mahenintsoa-events.categories.v1');
      if (saved) {
        const categories: unknown = JSON.parse(saved);
        if (
          !Array.isArray(categories) ||
          !categories.every(
            (category) =>
              category &&
              Number.isInteger(category.id) &&
              category.id > 0 &&
              typeof category.name === 'string' &&
              !!category.name.trim(),
          ) ||
          new Set(categories.map((category) => category.id)).size !== categories.length
        ) {
          throw new Error('Invalid categories');
        }
        return categories.map((category) => ({
          ...category,
          color:
            typeof category.color === 'string' && /^#[0-9a-f]{6}$/i.test(category.color)
              ? category.color
              : EQUIPMENT_CATEGORIES[(category.id - 1) % EQUIPMENT_CATEGORIES.length].color,
        }));
      }
    } catch {
      this.storageMessage.set('Les catégories enregistrées ne sont pas accessibles.');
    }
    return EQUIPMENT_CATEGORIES.map((category) => ({ ...category }));
  }

  createCategory(name: string, color: string): EquipmentCategory {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 80)
      throw new Error('Renseignez un nom de catégorie de 80 caractères maximum.');
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choisissez une couleur valide.');
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (this.categories.some((category) => normalize(category.name) === normalize(trimmedName)))
      throw new Error('Cette catégorie existe déjà.');
    const category = {
      id: Math.max(0, ...this.categories.map((category) => category.id)) + 1,
      name: trimmedName,
      color,
    };
    const next = [...this.categories, category];
    try {
      localStorage.setItem('mahenintsoa-events.categories.v1', JSON.stringify(next));
    } catch {
      throw new Error('Impossible d’enregistrer la catégorie dans le navigateur.');
    }
    this.categoryItems.set(next);
    return category;
  }

  constructor() {
    try {
      this.addChapiteaux();
      this.addAssetPhotos();
      if (localStorage.getItem(this.storageKey) === null && !this.storageMessage()) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items()));
      }
      if (!this.storageMessage()) {
        localStorage.setItem('mahenintsoa-events.categories.v1', JSON.stringify(this.categories));
      }
    } catch {
      this.storageMessage.set('Impossible d’initialiser les données dans le navigateur.');
    }
  }

  private addChapiteaux() {
    const migrationKey = 'mahenintsoa-events.chapiteaux.v1';
    if (this.storageMessage() || localStorage.getItem(migrationKey)) return;
    const normalize = (value: string) => value.trim().toLowerCase();
    const categories = [...this.categories];
    let category = categories.find((item) => normalize(item.name) === 'chapiteaux');
    if (!category) {
      category = {
        ...EQUIPMENT_CATEGORIES.find((item) => item.name === 'Chapiteaux')!,
        id: Math.max(0, ...categories.map((item) => item.id)) + 1,
      };
      categories.push(category);
    }
    const items = [...this.items()];
    for (const initial of INITIAL_EQUIPMENT.filter((item) => item.categoryId === 8)) {
      if (
        items.some(
          (item) =>
            item.categoryId === category.id &&
            normalize(item.designation) === normalize(initial.designation),
        )
      )
        continue;
      const id = Math.max(0, ...items.map((item) => item.id)) + 1;
      let number = id;
      let code = initial.code;
      while (items.some((item) => normalize(item.code) === normalize(code))) {
        code = 'MAT-' + String(number++).padStart(3, '0');
      }
      items.push({ ...initial, id, code, categoryId: category.id });
    }
    // Save categories first so persisted equipment always references an existing category.
    localStorage.setItem('mahenintsoa-events.categories.v1', JSON.stringify(categories));
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    localStorage.setItem(migrationKey, '1');
    this.categoryItems.set(categories);
    this.items.set(items);
  }

  /** Adds bundled catalogue photos only where no user photo has been saved. */
  private addAssetPhotos() {
    if (this.storageMessage()) return;
    const photosByDesignation = new Map(
      INITIAL_EQUIPMENT.filter((item) => item.photo).map((item) => [
        item.designation.trim().toLowerCase(),
        item.photo,
      ]),
    );
    const items = this.items();
    const next = items.map((item) =>
      item.photo === null
        ? { ...item, photo: photosByDesignation.get(item.designation.trim().toLowerCase()) ?? null }
        : item,
    );
    if (!next.some((item, index) => item.photo !== items[index].photo)) return;
    localStorage.setItem(this.storageKey, JSON.stringify(next));
    this.items.set(next);
  }

  private load(): Equipment[] {
    try {
      const current = localStorage.getItem(this.storageKey);
      const saved = current ?? localStorage.getItem('mahenintsoa-events.equipment.v1');
      if (saved) {
        const items: unknown = JSON.parse(saved);
        if (
          !Array.isArray(items) ||
          !items.every((item) => this.isValid(item)) ||
          new Set(items.map((item) => item.id)).size !== items.length ||
          new Set(items.map((item) => item.code.trim().toLowerCase())).size !== items.length
        ) {
          throw new Error('Invalid saved data');
        }
        // Add the example photo to the previous catalogue without replacing uploaded photos.
        return current
          ? items
          : items.map((item) =>
              item.id === 2 && !item.photo
                ? { ...item, photo: INITIAL_EQUIPMENT.find((initial) => initial.id === 2)!.photo }
                : item,
            );
      }
    } catch {
      this.storageMessage.set(
        'Les données locales ne sont pas accessibles. La liste initiale est affichée.',
      );
    }
    return INITIAL_EQUIPMENT.map((item) => ({ ...item }));
  }

  private isValid(value: unknown): value is Equipment {
    if (!value || typeof value !== 'object') return false;
    const item = value as Equipment;
    return (
      Number.isInteger(item.id) &&
      item.id > 0 &&
      typeof item.code === 'string' &&
      !!item.code.trim() &&
      typeof item.designation === 'string' &&
      !!item.designation.trim() &&
      this.categories.some((category) => category.id === item.categoryId) &&
      Number.isFinite(item.price) &&
      item.price >= 0 &&
      Number.isFinite(item.reimbursement) &&
      item.reimbursement >= 0 &&
      (item.photo === null ||
        /^assets\/[a-z0-9_]+\.(?:jpg|png|webp)$/i.test(item.photo) ||
        (typeof item.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(item.photo)))
    );
  }

  save(input: EquipmentInput, id?: number): Equipment {
    const item: Equipment = {
      ...input,
      code: input.code.trim(),
      designation: input.designation.trim(),
      id: id ?? Math.max(0, ...this.items().map((item) => item.id)) + 1,
    };
    if (!this.isValid(item))
      throw new Error('Veuillez renseigner correctement tous les champs obligatoires.');
    if (
      this.items().some(
        (existing) => existing.id !== id && existing.code.toLowerCase() === item.code.toLowerCase(),
      )
    ) {
      throw new Error('Ce code est déjà utilisé par un autre matériel.');
    }
    if (id !== undefined && !this.items().some((existing) => existing.id === id))
      throw new Error('Matériel introuvable.');
    const next =
      id === undefined
        ? [item, ...this.items()]
        : this.items().map((existing) => (existing.id === id ? item : existing));
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch {
      throw new Error(
        'Enregistrement impossible dans le navigateur. Libérez de l’espace ou réduisez la taille de la photo, puis réessayez.',
      );
    }
    this.items.set(next);
    this.storageMessage.set('');
    return item;
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Equipment } from './equipment.model';
import { EquipmentStore } from './equipment.store';
import { IconComponent } from '../icon';

@Component({
  selector: 'app-equipment',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './equipment.html',
  styleUrl: './equipment.scss',
})
export class EquipmentComponent {
  readonly store = inject(EquipmentStore);
  private readonly fb = inject(FormBuilder);
  readonly pageSize = 10;
  readonly page = signal(1);
  readonly filtersVisible = signal(false);
  readonly query = signal('');
  readonly categoryFilter = signal('');
  readonly mode = signal<'create' | 'edit' | 'view' | 'category' | null>(null);
  readonly categoryForm = this.fb.nonNullable.group({
    color: ['#2563eb', [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
    name: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
  });
  readonly selected = signal<Equipment | null>(null);
  readonly photo = signal<string | null>(null);
  readonly photoLoading = signal(false);
  readonly photoError = signal('');
  readonly error = signal('');
  readonly notice = signal('');
  private photoRequest = 0;
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(40), Validators.pattern(/\S/)]],
    designation: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(/\S/)]],
    categoryId: [null as number | null, Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    reimbursement: [null as number | null, [Validators.required, Validators.min(0)]],
  });
  readonly filtered = computed(() => {
    const query = this.normalize(this.query().trim());
    return this.store
      .equipment()
      .filter(
        (item) =>
          (!this.categoryFilter() || item.categoryId === Number(this.categoryFilter())) &&
          this.normalize(
            `${item.code} ${item.designation} ${this.categoryName(item.categoryId)}`,
          ).includes(query),
      );
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );
  readonly visibleItems = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly firstItem = computed(() =>
    this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly lastItem = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  private readonly numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  formatPrice(value: number) {
    return `Ar ${this.numberFormatter.format(value)}`;
  }
  categoryName(id: number) {
    return this.store.categories.find((category) => category.id === id)?.name ?? '—';
  }
  categoryColor(id: number) {
    return this.store.categories.find((category) => category.id === id)?.color ?? '#64748b';
  }
  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  filter(query: string, category: string) {
    this.query.set(query);
    this.categoryFilter.set(category);
    this.page.set(1);
  }
  goToPage(page: number) {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }

  open(mode: 'create' | 'edit' | 'view', item?: Equipment) {
    if (!this.canDiscard()) return;
    this.photoRequest++;
    this.photoLoading.set(false);
    this.photoError.set('');
    this.error.set('');
    this.selected.set(item ?? null);
    this.photo.set(item?.photo ?? null);
    this.form.reset({
      code: item?.code ?? '',
      designation: item?.designation ?? '',
      categoryId: item?.categoryId ?? null,
      price: item?.price ?? null,
      reimbursement: item?.reimbursement ?? null,
    });
    this.mode.set(mode);
    setTimeout(() =>
      document
        .getElementById(mode === 'view' ? 'equipment-panel-title' : 'equipment-code')
        ?.focus(),
    );
  }
  openCategory() {
    if (!this.canDiscard()) return;
    this.photoRequest++;
    this.photoLoading.set(false);
    this.selected.set(null);
    this.error.set('');
    this.categoryForm.reset();
    this.mode.set('category');
    setTimeout(() => document.getElementById('category-name')?.focus());
  }
  saveCategory() {
    this.categoryForm.markAllAsTouched();
    if (this.categoryForm.invalid) return;
    try {
      const { name, color } = this.categoryForm.getRawValue();
      const category = this.store.createCategory(name, color);
      this.notice.set(`Catégorie « ${category.name} » créée avec succès.`);
      this.categoryForm.markAsPristine();
      this.close();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  }
  private canDiscard() {
    return (
      !this.mode() ||
      this.mode() === 'view' ||
      !(this.mode() === 'category' ? this.categoryForm.dirty : this.form.dirty) ||
      window.confirm('Abandonner les modifications non enregistrées ?')
    );
  }
  close() {
    if (!this.canDiscard()) return;
    this.photoRequest++;
    this.photoLoading.set(false);
    this.mode.set(null);
    document.getElementById('create-equipment')?.focus();
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.photoLoading() || this.photoError()) return;
    const value = this.form.getRawValue();
    try {
      const item = this.store.save(
        {
          code: value.code!,
          designation: value.designation!,
          categoryId: value.categoryId!,
          price: value.price!,
          reimbursement: value.reimbursement!,
          photo: this.photo(),
        },
        this.mode() === 'edit' ? this.selected()?.id : undefined,
      );
      this.notice.set(
        this.mode() === 'create' ? 'Matériel créé avec succès.' : 'Matériel modifié avec succès.',
      );
      this.form.markAsPristine();
      this.filter('', '');
      this.page.set(
        Math.floor(
          this.filtered().findIndex((existing) => existing.id === item.id) / this.pageSize,
        ) + 1,
      );
      this.open('view', item);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  }
  async selectPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.photoError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.photoError.set('Choisissez une image JPG, PNG ou WebP de 1 Mo maximum.');
      return;
    }
    const request = ++this.photoRequest;
    this.photoLoading.set(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      if (request === this.photoRequest) {
        this.photo.set(data);
        this.form.markAsDirty();
      }
    } catch {
      if (request === this.photoRequest)
        this.photoError.set('Cette image ne peut pas être lue. Choisissez un autre fichier.');
    } finally {
      if (request === this.photoRequest) this.photoLoading.set(false);
    }
  }
  removePhoto() {
    this.photoRequest++;
    this.photo.set(null);
    this.photoLoading.set(false);
    this.photoError.set('');
    this.form.markAsDirty();
  }
}

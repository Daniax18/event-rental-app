import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../icon';
import { Client } from './clients.model';
import { ClientsStore } from './clients.store';

type ClientFilterField = Exclude<keyof Client, 'id'>;

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './clients.html',
  styleUrls: ['../equipment/equipment.scss', './clients.scss'],
})
export class ClientsComponent {
  readonly store = inject(ClientsStore);
  private readonly fb = inject(FormBuilder);
  readonly pageSize = 10;
  readonly page = signal(1);
  readonly filtersVisible = signal(false);
  readonly filters = signal<Partial<Record<ClientFilterField, string>>>({});
  readonly hasFilters = computed(() => Object.values(this.filters()).some((value) => value.trim()));
  readonly mode = signal<'create' | 'edit' | 'view' | null>(null);
  readonly selected = signal<Client | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly fields = [
    {
      key: 'nomOuRaisonSociale',
      label: 'Nom ou raison sociale',
      required: true,
      autocomplete: 'name',
    },
    { key: 'telephone', label: 'Téléphone', required: true, autocomplete: 'tel' },
    { key: 'adresse', label: 'Adresse', required: true, autocomplete: 'street-address' },
    { key: 'cin', label: 'CIN', required: false, autocomplete: 'off' },
    { key: 'nif', label: 'NIF', required: false, autocomplete: 'off' },
    { key: 'stat', label: 'STAT', required: false, autocomplete: 'off' },
  ] as const;
  readonly form = this.fb.nonNullable.group({
    nomOuRaisonSociale: [
      '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)],
    ],
    telephone: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]],
    adresse: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]],
    cin: ['', Validators.maxLength(80)],
    nif: ['', Validators.maxLength(80)],
    stat: ['', Validators.maxLength(80)],
  });
  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  readonly filtered = computed(() => {
    const filters = this.filters();
    return this.store.clients().filter((item) =>
      this.fields.every(({ key }) => {
        const query = this.normalize((filters[key] ?? '').trim());
        if (!query) return true;
        const value = this.normalize(item[key] ?? '');
        return (
          value.includes(query) ||
          (key === 'telephone' &&
            /^[\d\s+().-]+$/.test(query) &&
            /\d/.test(query) &&
            value.replace(/\D/g, '').includes(query.replace(/\D/g, '')))
        );
      }),
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
  filter(field: ClientFilterField, value: string) {
    this.filters.update((filters) => ({ ...filters, [field]: value }));
    this.page.set(1);
  }
  resetFilters() {
    this.filters.set({});
    this.page.set(1);
  }
  goToPage(page: number) {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }
  private canDiscard() {
    return (
      !this.mode() ||
      this.mode() === 'view' ||
      !this.form.dirty ||
      window.confirm('Abandonner les modifications non enregistrées ?')
    );
  }
  open(mode: 'create' | 'edit' | 'view', item?: Client) {
    if (!this.canDiscard()) return;
    this.error.set('');
    this.selected.set(item ?? null);
    this.form.reset({
      nomOuRaisonSociale: item?.nomOuRaisonSociale ?? '',
      telephone: item?.telephone ?? '',
      adresse: item?.adresse ?? '',
      cin: item?.cin ?? '',
      nif: item?.nif ?? '',
      stat: item?.stat ?? '',
    });
    this.mode.set(mode);
    setTimeout(() =>
      document
        .getElementById(mode === 'view' ? 'client-panel-title' : 'client-nomOuRaisonSociale')
        ?.focus(),
    );
  }
  close() {
    if (!this.canDiscard()) return;
    this.mode.set(null);
    document.getElementById('create-client')?.focus();
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    try {
      const item = this.store.save(
        this.form.getRawValue(),
        this.mode() === 'edit' ? this.selected()?.id : undefined,
      );
      this.notice.set(
        this.mode() === 'create' ? 'Client créé avec succès.' : 'Client modifié avec succès.',
      );
      this.form.markAsPristine();
      this.resetFilters();
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
}

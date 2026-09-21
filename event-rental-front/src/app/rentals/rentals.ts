import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon';
import { ClientsStore } from '../clients/clients.store';
import { EquipmentStore } from '../equipment/equipment.store';
import { Client } from '../clients/clients.model';
import { Equipment } from '../equipment/equipment.model';
import { RentalsStore } from './rentals.store';
import { RentalStatus } from './rentals.model';
import { Rental } from './rentals.model';

interface RentalLine {
  id: number;
  equipmentId: number;
  designation: string;
  quantity: number;
  unitPrice: number;
  reimbursement: number;
}

@Component({
  selector: 'app-rentals',
  imports: [FormsModule, IconComponent],
  templateUrl: './rentals.html',
  styleUrls: ['../equipment/equipment.scss', './rentals.scss'],
})
export class RentalsComponent {
  readonly clientsStore = inject(ClientsStore);
  readonly equipmentStore = inject(EquipmentStore);
  readonly rentalsStore = inject(RentalsStore);
  readonly view = signal<'list' | 'create'>('list');
  readonly validationAttempted = signal(false);
  readonly saveError = signal('');
  readonly saveMessage = signal('');
  readonly selectedClientId = signal<number | null>(null);
  readonly activeRental = signal<Rental | null>(null);
  readonly canAddItems = computed(() => {
    const rental = this.activeRental();
    return !rental || rental.statut === 'Confirmé' || rental.statut === 'En cours';
  });
  readonly canRemoveItems = computed(() => {
    const rental = this.activeRental();
    return !rental || rental.statut === 'Confirmé';
  });
  readonly pageSize = 10;
  readonly page = signal(1);
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.rentalsStore.rentals().length / this.pageSize)),
  );
  readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );
  readonly visibleRentals = computed(() =>
    this.rentalsStore
      .rentals()
      .slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly firstRental = computed(() =>
    this.rentalsStore.rentals().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly lastRental = computed(() =>
    Math.min(this.page() * this.pageSize, this.rentalsStore.rentals().length),
  );
  readonly clientFields = [
    { key: 'telephone', label: 'Numéro de téléphone', required: true },
    { key: 'cin', label: 'CIN', required: true },
    { key: 'nomOuRaisonSociale', label: 'Nom ou raison sociale', required: true },
    { key: 'nif', label: 'NIF', required: false },
    { key: 'adresse', label: 'Adresse', required: true },
    { key: 'stat', label: 'STAT', required: false },
  ] as const;
  client = { nomOuRaisonSociale: '', telephone: '', cin: '', adresse: '', nif: '', stat: '' };
  readonly phoneQuery = signal('');
  readonly clientMatches = computed(() => {
    const digits = this.phoneQuery().replace(/\D/g, '');
    return digits
      ? this.clientsStore
          .clients()
          .filter((client) => client.telephone.replace(/\D/g, '').includes(digits))
      : [];
  });
  readonly days = signal<number | null>(1);
  readonly deliveryDate = signal('');
  readonly returnDate = signal('');
  readonly validDays = computed(() => Number.isSafeInteger(this.days()) && this.days()! > 0);
  readonly dateError = computed(() =>
    this.deliveryDate() && this.returnDate() && this.returnDate() < this.deliveryDate()
      ? 'La date de retour doit être postérieure ou égale à la date de livraison.'
      : '',
  );
  readonly equipmentId = signal<number | null>(null);
  readonly equipmentQuery = signal('');
  readonly equipmentMatches = computed(() => {
    const query = this.normalizeEquipment(this.equipmentQuery().trim());
    return this.equipmentStore
      .equipment()
      .filter((item) => this.normalizeEquipment(this.equipmentLabel(item)).includes(query));
  });
  equipmentLabel(item: Equipment) {
    const category = this.equipmentStore.categories.find(
      (category) => category.id === item.categoryId,
    );
    return (category?.name ?? 'Sans catégorie') + ' - ' + item.designation;
  }
  private normalizeEquipment(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  searchEquipment(value: string) {
    this.equipmentQuery.set(value);
    const match = this.equipmentStore
      .equipment()
      .find((item) => this.equipmentLabel(item) === value);
    this.selectEquipment(match?.id ?? null);
  }
  readonly quantity = signal<number | null>(1);
  readonly unitPrice = signal<number | null>(null);
  readonly advance = signal<number | null>(0);
  readonly lines = signal<RentalLine[]>([]);
  private nextLineId = 1;
  readonly validDraft = computed(
    () =>
      this.equipmentStore.equipment().some((item) => item.id === this.equipmentId()) &&
      Number.isSafeInteger(this.quantity()) &&
      this.quantity()! > 0 &&
      this.validAmount(this.unitPrice()) &&
      Number.isFinite(this.quantity()! * this.unitPrice()! * (this.days() ?? 0)) &&
      this.validDays(),
  );
  readonly draftDaily = computed(() =>
    this.validDraft() ? this.money(this.quantity()! * this.unitPrice()!) : 0,
  );
  readonly draftTotal = computed(() =>
    this.money(this.draftDaily() * (this.validDays() ? this.days()! : 0)),
  );
  readonly total = computed(() =>
    this.money(this.lines().reduce((sum, line) => sum + this.lineTotal(line), 0)),
  );
  readonly deposit = computed(() => this.money(this.total() / 2));
  readonly totalWithDeposit = computed(() => this.money(this.total() + this.deposit()));
  readonly advanceError = computed(() =>
    !this.validAmount(this.advance())
      ? 'Saisissez une avance positive ou nulle.'
      : this.advance()! > this.totalWithDeposit()
        ? 'L’avance ne peut pas dépasser le prix total avec caution.'
        : '',
  );
  readonly remaining = computed(() =>
    this.money(this.totalWithDeposit() - (this.validAmount(this.advance()) ? this.advance()! : 0)),
  );
  private readonly formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR');

  clientName(clientId: number) {
    return (
      this.clientsStore.clients().find((client) => client.id === clientId)?.nomOuRaisonSociale ??
      'Client introuvable'
    );
  }
  formatDate(value: string) {
    return this.dateFormatter.format(new Date(`${value}T00:00:00`));
  }
  statusClass(status: RentalStatus) {
    switch (status) {
      case 'Confirmé':
        return 'confirmed';
      case 'En cours':
        return 'ongoing';
      case 'Retour Caution':
        return 'deposit-return';
      case 'Terminé':
        return 'completed';
    }
  }
  goToPage(page: number) {
    this.page.set(Math.min(this.pageCount(), Math.max(1, page)));
  }
  newRental() {
    this.saveError.set('');
    this.saveMessage.set('');
    this.selectedClientId.set(null);
    this.validationAttempted.set(false);
    this.activeRental.set(null);
    this.client = {
      nomOuRaisonSociale: '',
      telephone: '',
      cin: '',
      adresse: '',
      nif: '',
      stat: '',
    };
    this.phoneQuery.set('');
    this.days.set(1);
    this.deliveryDate.set('');
    this.returnDate.set('');
    this.equipmentId.set(null);
    this.equipmentQuery.set('');
    this.quantity.set(1);
    this.unitPrice.set(null);
    this.advance.set(0);
    this.lines.set([]);
    this.nextLineId = 1;
    this.view.set('create');
  }
  viewRental(rental: Rental) {
    this.loadRental(rental);
  }
  editRental(rental: Rental) {
    if (rental.statut !== 'Confirmé' && rental.statut !== 'En cours') return;
    this.loadRental(rental);
  }
  private loadRental(rental: Rental) {
    this.saveError.set('');
    this.saveMessage.set('');
    this.selectedClientId.set(null);
    this.validationAttempted.set(false);
    this.activeRental.set(rental);
    const client = this.clientsStore.clients().find((item) => item.id === rental.clientId);
    if (client) this.selectClient(client);
    this.days.set(rental.nombreJour);
    this.deliveryDate.set(rental.dateLivraison);
    this.returnDate.set(rental.dateRetour);
    this.advance.set(rental.paid);
    this.lines.set(
      this.rentalsStore
        .rentalItems()
        .filter((item) => item.rentalId === rental.id)
        .map((item) => {
          const equipment = this.equipmentStore
            .equipment()
            .find((existing) => existing.id === item.materielId);
          return {
            id: item.id,
            equipmentId: item.materielId,
            designation: equipment?.designation ?? 'Matériel introuvable',
            quantity: item.qty,
            unitPrice: item.pu,
            reimbursement: equipment?.reimbursement ?? 0,
          };
        }),
    );
    this.nextLineId = Math.max(0, ...this.lines().map((line) => line.id)) + 1;
    this.view.set('create');
  }

  searchClient(value: string) {
    this.selectedClientId.set(null);
    this.client.telephone = value;
    this.phoneQuery.set(value);
  }
  selectClient(client: Client) {
    this.selectedClientId.set(client.id);
    this.client = {
      nomOuRaisonSociale: client.nomOuRaisonSociale,
      telephone: client.telephone,
      adresse: client.adresse,
      cin: client.cin ?? '',
      nif: client.nif ?? '',
      stat: client.stat ?? '',
    };
    this.phoneQuery.set('');
  }
  selectEquipment(id: number | null) {
    this.equipmentId.set(id);
    const item = this.equipmentStore.equipment().find((item) => item.id === id);
    if (item) this.equipmentQuery.set(this.equipmentLabel(item));
    this.unitPrice.set(
      this.equipmentStore.equipment().find((item) => item.id === id)?.price ?? null,
    );
  }
  saveRental() {
    this.validationAttempted.set(true);
    this.saveError.set('');
    if (this.activeRental() || this.view() !== 'create') return;
    if (
      this.clientFields.some((field) => field.required && !this.client[field.key].trim()) ||
      !this.validDays() ||
      !this.deliveryDate() ||
      !this.returnDate() ||
      this.dateError() ||
      !this.lines().length ||
      this.advanceError() ||
      !Number.isFinite(this.totalWithDeposit())
    )
      return;
    try {
      let client = this.clientsStore.clients().find((item) => item.id === this.selectedClientId());
      if (!client) {
        const phone = this.client.telephone.replace(/\D/g, '');
        client = this.clientsStore
          .clients()
          .find(
            (item) =>
              (phone && item.telephone.replace(/\D/g, '') === phone) ||
              (item.cin && item.cin.trim() === this.client.cin.trim()),
          );
      }
      if (!client) client = this.clientsStore.save(this.client);
      // Keep the resolved ID for a retry if saving the rental fails.
      this.selectedClientId.set(client.id);
      const rental = this.rentalsStore.create(
        {
          clientId: client.id,
          nombreJour: this.days()!,
          dateLivraison: this.deliveryDate(),
          dateRetour: this.returnDate(),
          prixTotal: this.total(),
          paid: this.advance()!,
          caution: this.deposit(),
        },
        this.lines().map((line) => ({
          materielId: line.equipmentId,
          qty: line.quantity,
          pu: line.unitPrice,
          nombreJour: this.days()!,
          total: this.lineTotal(line),
        })),
      );
      this.activeRental.set(rental);
      this.saveMessage.set('Location enregistrée avec succès.');
      window.setTimeout(() => this.saveMessage.set(''), 3500);
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'Impossible d’enregistrer la location.',
      );
    }
  }
  printRental() {
    const rental = this.activeRental();
    if (rental) {
      const url = new URL(`factures/${rental.id}`, document.baseURI).toString();
      window.open(url, '_blank', 'noopener');
    }
  }
  addLine() {
    if (!this.canAddItems() || !this.validDraft()) return;
    const equipment = this.equipmentStore
      .equipment()
      .find((item) => item.id === this.equipmentId())!;
    this.lines.update((lines) => [
      ...lines,
      {
        id: this.nextLineId++,
        equipmentId: equipment.id,
        designation: equipment.designation,
        quantity: this.quantity()!,
        unitPrice: this.unitPrice()!,
        reimbursement: equipment.reimbursement,
      },
    ]);
    this.equipmentId.set(null);
    this.equipmentQuery.set('');
    this.quantity.set(1);
    this.unitPrice.set(null);
  }
  removeLine(id: number) {
    if (!this.canRemoveItems()) return;
    this.lines.update((lines) => lines.filter((line) => line.id !== id));
  }
  dailyTotal(line: RentalLine) {
    return this.money(line.quantity * line.unitPrice);
  }
  lineTotal(line: RentalLine) {
    return this.money(this.dailyTotal(line) * (this.validDays() ? this.days()! : 0));
  }
  private validAmount(value: number | null): boolean {
    return value !== null && Number.isFinite(value) && value >= 0;
  }
  private money(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  formatPrice(value: number) {
    return this.formatter.format(value) + ' Ar';
  }
}

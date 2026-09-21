import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClientsStore } from '../clients/clients.store';
import { EquipmentStore } from '../equipment/equipment.store';
import { RentalsStore } from './rentals.store';

@Component({
  selector: 'app-rental-invoice',
  templateUrl: './rental-invoice.html',
  styleUrl: './rental-invoice.scss',
})
export class RentalInvoiceComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clientsStore = inject(ClientsStore);
  private readonly equipmentStore = inject(EquipmentStore);
  private readonly rentalsStore = inject(RentalsStore);
  private readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly rental = computed(() => this.rentalsStore.rentals().find((item) => item.id === this.id));
  readonly client = computed(() =>
    this.clientsStore.clients().find((item) => item.id === this.rental()?.clientId),
  );
  readonly items = computed(() =>
    this.rentalsStore
      .rentalItems()
      .filter((item) => item.rentalId === this.id)
      .map((item) => ({
        ...item,
        designation:
          this.equipmentStore.equipment().find((equipment) => equipment.id === item.materielId)
            ?.designation ?? 'Matériel introuvable',
        reimbursement:
          this.equipmentStore.equipment().find((equipment) => equipment.id === item.materielId)
            ?.reimbursement ?? 0,
      })),
  );
  readonly formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  readonly dateFormatter = new Intl.DateTimeFormat('fr-FR');

  money(value: number) {
    return `${this.formatter.format(value)} Ar`;
  }
  date(value: string) {
    return this.dateFormatter.format(new Date(`${value}T00:00:00`));
  }
  print() {
    window.print();
  }
}

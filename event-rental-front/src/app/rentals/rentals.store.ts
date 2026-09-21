import { Injectable, signal } from '@angular/core';
import { INITIAL_RENTALS, INITIAL_RENTAL_ITEMS, rentalInvoiceNumber } from './rentals.data';
import { Rental, RentalItem } from './rentals.model';

@Injectable({ providedIn: 'root' })
export class RentalsStore {
  private readonly rentalsKey = 'mahenintsoa-events.rentals.v1';
  private readonly rentalItemsKey = 'mahenintsoa-events.rental-items.v1';
  readonly storageMessage = signal('');
  private readonly rentalRecords = signal<Rental[]>(this.load(this.rentalsKey, INITIAL_RENTALS));
  private readonly itemRecords = signal<RentalItem[]>(
    this.load(this.rentalItemsKey, INITIAL_RENTAL_ITEMS),
  );
  readonly rentals = this.rentalRecords.asReadonly();
  readonly rentalItems = this.itemRecords.asReadonly();

  create(
    input: Omit<Rental, 'id' | 'numeroFacture' | 'statut'>,
    lines: Omit<RentalItem, 'id' | 'rentalId'>[],
  ): Rental {
    const id = Math.max(0, ...this.rentals().map((rental) => rental.id)) + 1;
    const rental: Rental = {
      ...input,
      id,
      numeroFacture: rentalInvoiceNumber(id, input.dateLivraison),
      statut: 'Confirmé',
    };
    const firstItemId = Math.max(0, ...this.rentalItems().map((item) => item.id)) + 1;
    const items = lines.map((line, index) => ({ ...line, id: firstItemId + index, rentalId: id }));
    const nextRentals = [rental, ...this.rentals()];
    const nextItems = [...this.rentalItems(), ...items];
    let previousItems: string | null = null;
    let itemsWritten = false;
    try {
      previousItems = localStorage.getItem(this.rentalItemsKey);
      localStorage.setItem(this.rentalItemsKey, JSON.stringify(nextItems));
      itemsWritten = true;
      localStorage.setItem(this.rentalsKey, JSON.stringify(nextRentals));
    } catch {
      if (itemsWritten) {
        try {
          if (previousItems === null) localStorage.removeItem(this.rentalItemsKey);
          else localStorage.setItem(this.rentalItemsKey, previousItems);
        } catch {
          this.storageMessage.set('Impossible de restaurer les matériels après l’échec de sauvegarde.');
        }
      }
      throw new Error('Enregistrement impossible dans le navigateur. Libérez de l’espace puis réessayez.');
    }
    this.rentalRecords.set(nextRentals);
    this.itemRecords.set(nextItems);
    this.storageMessage.set('');
    return rental;
  }

  constructor() {
    try {
      localStorage.setItem(this.rentalsKey, JSON.stringify(this.rentals()));
      if (localStorage.getItem(this.rentalItemsKey) === null) {
        localStorage.setItem(this.rentalItemsKey, JSON.stringify(this.rentalItems()));
      }
    } catch {
      this.storageMessage.set('Impossible d’initialiser les locations dans le navigateur.');
    }
  }

  private load<T>(key: string, initial: T[]): T[] {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const records: unknown = JSON.parse(saved);
        if (!Array.isArray(records)) throw new Error('Invalid rental data');
        if (key === this.rentalsKey) {
          return records.map((record) => {
            const rental = record as Rental;
            return {
              ...rental,
              numeroFacture:
                typeof rental.numeroFacture === 'string' && rental.numeroFacture.trim()
                  ? rental.numeroFacture
                  : rentalInvoiceNumber(rental.id, rental.dateLivraison),
            };
          }) as T[];
        }
        return records as T[];
      }
    } catch {
      this.storageMessage.set('Les données locales des locations ne sont pas accessibles.');
    }
    return initial.map((record) => ({ ...record }));
  }
}

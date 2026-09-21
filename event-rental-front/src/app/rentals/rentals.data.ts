import { INITIAL_EQUIPMENT } from '../equipment/equipment.data';
import { Rental, RentalItem, RentalStatus } from './rentals.model';

interface RentalItemSeed {
  id: number;
  rentalId: number;
  materielId: number;
  qty: number;
  nombreJour: number;
}

const itemSeeds: RentalItemSeed[] = [
  { id: 1, rentalId: 1, materielId: 1, qty: 50, nombreJour: 2 },
  { id: 2, rentalId: 1, materielId: 6, qty: 5, nombreJour: 2 },
  { id: 3, rentalId: 2, materielId: 42, qty: 2, nombreJour: 1 },
  { id: 4, rentalId: 2, materielId: 3, qty: 40, nombreJour: 1 },
  { id: 5, rentalId: 3, materielId: 43, qty: 1, nombreJour: 3 },
  { id: 6, rentalId: 3, materielId: 16, qty: 100, nombreJour: 3 },
  { id: 7, rentalId: 4, materielId: 24, qty: 1, nombreJour: 2 },
  { id: 8, rentalId: 4, materielId: 26, qty: 6, nombreJour: 2 },
  { id: 9, rentalId: 5, materielId: 30, qty: 4, nombreJour: 1 },
  { id: 10, rentalId: 5, materielId: 40, qty: 8, nombreJour: 1 },
];

function equipmentPrice(materielId: number): number {
  const equipment = INITIAL_EQUIPMENT.find((item) => item.id === materielId);
  if (!equipment) throw new Error(`Matériel ${materielId} introuvable dans les données initiales.`);
  return equipment.price;
}

export const INITIAL_RENTAL_ITEMS: RentalItem[] = itemSeeds.map((item) => {
  const pu = equipmentPrice(item.materielId);
  return { ...item, pu, total: item.qty * pu * item.nombreJour };
});

export function rentalInvoiceNumber(id: number, dateLivraison: string): string {
  return `FAC-${dateLivraison.slice(0, 4)}-${String(id).padStart(4, '0')}`;
}

interface RentalSeed {
  id: number;
  clientId: number;
  nombreJour: number;
  dateLivraison: string;
  dateRetour: string;
  statut: RentalStatus;
}

const rentalSeeds: RentalSeed[] = [
  {
    id: 1,
    clientId: 1,
    nombreJour: 2,
    dateLivraison: '2026-09-25',
    dateRetour: '2026-09-27',
    statut: 'Confirmé',
  },
  {
    id: 2,
    clientId: 2,
    nombreJour: 1,
    dateLivraison: '2026-09-28',
    dateRetour: '2026-09-29',
    statut: 'En cours',
  },
  {
    id: 3,
    clientId: 3,
    nombreJour: 3,
    dateLivraison: '2026-10-01',
    dateRetour: '2026-10-04',
    statut: 'Retour Caution',
  },
  {
    id: 4,
    clientId: 6,
    nombreJour: 2,
    dateLivraison: '2026-10-05',
    dateRetour: '2026-10-07',
    statut: 'Terminé',
  },
  {
    id: 5,
    clientId: 7,
    nombreJour: 1,
    dateLivraison: '2026-10-10',
    dateRetour: '2026-10-11',
    statut: 'Confirmé',
  },
];

export const INITIAL_RENTALS: Rental[] = rentalSeeds.map((rental) => {
  const prixTotal = INITIAL_RENTAL_ITEMS.filter((item) => item.rentalId === rental.id).reduce(
    (total, item) => total + item.total,
    0,
  );
  const caution = prixTotal / 2;
  const paid =
    rental.statut === 'En cours'
      ? prixTotal / 2
      : rental.statut === 'Retour Caution' || rental.statut === 'Terminé'
        ? prixTotal
        : 0;
  return {
    ...rental,
    numeroFacture: rentalInvoiceNumber(rental.id, rental.dateLivraison),
    prixTotal,
    paid,
    caution,
  };
});

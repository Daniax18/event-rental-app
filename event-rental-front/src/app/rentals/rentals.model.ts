export type RentalStatus = 'Confirmé' | 'En cours' | 'Retour Caution' | 'Terminé';

export interface Rental {
  id: number;
  numeroFacture: string;
  clientId: number;
  nombreJour: number;
  dateLivraison: string;
  dateRetour: string;
  prixTotal: number;
  paid: number;
  caution: number;
  statut: RentalStatus;
}

export interface RentalItem {
  id: number;
  rentalId: number;
  materielId: number;
  qty: number;
  pu: number;
  nombreJour: number;
  total: number;
}

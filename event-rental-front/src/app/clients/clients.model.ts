export interface Client {
  id: number;
  nomOuRaisonSociale: string;
  telephone: string;
  adresse: string;
  cin: string | null;
  nif: string | null;
  stat: string | null;
}
export type ClientInput = Omit<Client, 'id'>;

export interface EquipmentCategory {
  id: number;
  name: string;
  color: string;
}

export interface Equipment {
  id: number;
  code: string;
  categoryId: number;
  designation: string;
  price: number;
  reimbursement: number;
  photo: string | null;
}

export type EquipmentInput = Omit<Equipment, 'id'>;

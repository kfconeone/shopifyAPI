export interface ILineItem {
  quantity: number;
  sku: string;
  title: string;
  vid: string;
}

export interface IOrder {
  amount: string;
  createdAt: number;
  customer: string;
  email: string;
  fullyPaid: false;
  id: string;
  items: ILineItem[];
  kolSuffix: string;
  name: string;
  status?: string; //KOL 領取紅利了沒
}

export interface IProduct {
  handle: string;
  price: number;
  sku: string;
  vid: string;
  default: number;
}

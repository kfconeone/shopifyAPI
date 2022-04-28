export interface ILineItem {
  quantity: number;
  sku: string;
  title: string;
  price: number;
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

export interface IOrders {
  [key: string]: IOrder;
}

export interface IProduct {
  handle: string;
  price: number;
  sku: string;
  default: number;
  vid: string;
  ex: {};
}

export interface IProducts {
  [key: string]: IProduct;
}

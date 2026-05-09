export type SectionId =
  | "venta"
  | "vendedor"
  | "inventario"
  | "historial"
  | "configuracion";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  form: string;
  concentration: string;
  price: number;
  stock: number;
  unlimitedStock?: boolean;
  retainedPrescription?: boolean;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type SaleRecord = {
  id: string;
  createdAt: string;
  receiptUrl?: string;
  sellerName?: string;
  patientRut?: string;
  healthProvider?: "FONASA" | "ISAPRE";
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
};

export type AppSettings = {
  pharmacyName: string;
  cashierName: string;
  currency: string;
  lowStockThreshold: number;
  requireCustomerRut: boolean;
  vademecumEnabled: boolean;
};

export type AppState = {
  products: Product[];
  sales: SaleRecord[];
  settings: AppSettings;
  sellerName: string;
};

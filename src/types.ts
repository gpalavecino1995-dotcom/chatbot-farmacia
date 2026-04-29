export type SectionId = "venta" | "inventario" | "historial" | "configuracion";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  form: string;
  concentration: string;
  price: number;
  stock: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type SaleRecord = {
  id: string;
  createdAt: string;
  customerEmail: string;
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
};

export type AppState = {
  products: Product[];
  sales: SaleRecord[];
  settings: AppSettings;
};

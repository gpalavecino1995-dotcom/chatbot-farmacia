import type { AppState } from "../types";

export const initialState: AppState = {
  products: [
    {
      id: "paracetamol-500",
      sku: "7800001000011",
      name: "Paracetamol",
      category: "Analgesico",
      form: "Comprimidos",
      concentration: "500 mg",
      price: 1590,
      stock: 28
    },
    {
      id: "ibuprofeno-400",
      sku: "7800001000028",
      name: "Ibuprofeno",
      category: "Antiinflamatorio",
      form: "Comprimidos",
      concentration: "400 mg",
      price: 2490,
      stock: 16
    },
    {
      id: "loratadina-10",
      sku: "7800001000035",
      name: "Loratadina",
      category: "Antialergico",
      form: "Comprimidos",
      concentration: "10 mg",
      price: 3190,
      stock: 9
    },
    {
      id: "amoxicilina-500",
      sku: "7800001000042",
      name: "Amoxicilina",
      category: "Antibiotico",
      form: "Capsulas",
      concentration: "500 mg",
      price: 6890,
      stock: 6
    },
    {
      id: "suero-fisiologico",
      sku: "7800001000059",
      name: "Suero fisiologico",
      category: "Primeros auxilios",
      form: "Ampollas",
      concentration: "0,9%",
      price: 1290,
      stock: 22
    }
  ],
  sales: [],
  settings: {
    pharmacyName: "Centro de Simulacion Duoc UC",
    cashierName: "Estudiante en role play",
    currency: "CLP",
    lowStockThreshold: 8
  }
};

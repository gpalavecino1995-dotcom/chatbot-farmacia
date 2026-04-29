import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import * as XLSX from "xlsx";
import type { AppState, Product } from "../../types";
import { formatMoney } from "../../utils/format";

type InventarioViewProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
};

export function InventarioView({ state, setState }: InventarioViewProps) {
  const [importMessage, setImportMessage] = useState(
    "Puedes cargar el Excel del centro de simulaciones para reemplazar la base local."
  );

  function updateProduct(productId: string, patch: Partial<Product>) {
    setState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? { ...product, ...patch } : product
      )
    }));
  }

  function readText(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function readNumber(row: Record<string, unknown>, keys: string[], fallback = 0) {
    const raw = readText(row, keys);
    if (!raw) {
      return fallback;
    }

    const normalized = raw.replace(/\$/g, "").replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeProduct(row: Record<string, unknown>, index: number): Product {
    const sku = readText(row, ["SKU", "sku", "Codigo", "Código", "codigo_barra"]);
    const fantasyName = readText(row, [
      "Denominación de fantasía",
      "Denominacion de fantasia",
      "nombre",
      "Nombre"
    ]);
    const activeIngredient = readText(row, [
      "Principio activo (DCI)",
      "principio_activo",
      "Principio activo"
    ]);
    const doseForm = readText(row, [
      "Dosis / Forma farmacéutica",
      "Dosis / Forma farmaceutica",
      "presentacion",
      "Presentación",
      "Presentacion"
    ]);

    return {
      id: sku || `producto-importado-${index + 1}`,
      sku: sku || `SIN-SKU-${index + 1}`,
      name: fantasyName || activeIngredient || `Producto importado ${index + 1}`,
      category:
        readText(row, [
          "Categoría terapéutica (>3 PA)",
          "Categoria terapeutica (>3 PA)",
          "categoria",
          "Categoria"
        ]) || "Sin categoria",
      form:
        readText(row, ["Forma", "forma", "Presentación", "Presentacion"]) ||
        doseForm ||
        "No especificada",
      concentration: doseForm || "No especificada",
      price: readNumber(row, ["Precio de venta", "precio", "Precio", "price"], 0),
      stock: readNumber(row, ["stock", "Stock", "STOCK", "cantidad", "Cantidad"], 0)
    };
  }

  async function importProducts(file: File) {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: ""
      });

      const products = rows
        .map((row, index) => normalizeProduct(row, index))
        .filter((product) => product.sku || product.name);

      if (products.length === 0) {
        setImportMessage("No se encontraron productos validos en el Excel.");
        return;
      }

      setState((current) => ({ ...current, products }));
      setImportMessage(
        `Base cargada desde "${file.name}": ${products.length} productos importados.`
      );
    } catch {
      setImportMessage("No se pudo leer el archivo. Revisa que sea un .xlsx valido.");
    }
  }

  return (
    <section className="view-stack">
      <header className="section-header">
        <div>
          <span className="eyebrow">Modulo docente</span>
          <h2>Inventario</h2>
          <p>Edita precios y stock para preparar escenarios de role play.</p>
        </div>
      </header>

      <section className="import-card">
        <div>
          <span className="eyebrow">Carga de base SKU</span>
          <h3>Importar productos desde Excel</h3>
          <p>
            Usa el archivo con columnas como SKU, principio activo, denominacion,
            presentacion, precio y stock. Si el Excel no trae stock, se cargara
            en 0 para que puedas completarlo despues.
          </p>
          <strong>{importMessage}</strong>
        </div>
        <label className="file-upload">
          Subir Excel
          <input
            accept=".xlsx,.xls"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void importProducts(file);
              }
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      </section>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Codigo</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span>
                    {product.form} · {product.concentration}
                  </span>
                </td>
                <td>{product.sku}</td>
                <td>
                  <input
                    min="0"
                    onChange={(event) =>
                      updateProduct(product.id, {
                        price: Number(event.target.value)
                      })
                    }
                    type="number"
                    value={product.price}
                  />
                  <small>{formatMoney(product.price, state.settings.currency)}</small>
                </td>
                <td>
                  <input
                    min="0"
                    onChange={(event) =>
                      updateProduct(product.id, {
                        stock: Number(event.target.value)
                      })
                    }
                    type="number"
                    value={product.stock}
                  />
                </td>
                <td>
                  {product.category}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

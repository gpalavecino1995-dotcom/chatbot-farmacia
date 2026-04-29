import type { Dispatch, SetStateAction } from "react";
import { FormEvent, useState } from "react";
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
  const [scanProduct, setScanProduct] = useState({
    sku: "",
    name: "",
    concentration: "",
    form: "",
    category: "",
    price: "",
    stock: "",
    unlimitedStock: false
  });
  const [scanMessage, setScanMessage] = useState(
    "Escanea el codigo de barra y completa los datos minimos del producto."
  );

  function updateProduct(productId: string, patch: Partial<Product>) {
    setState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === productId ? { ...product, ...patch } : product
      )
    }));
  }

  function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `¿Eliminar "${product.name}" del inventario simulado?`
    );

    if (!confirmed) {
      return;
    }

    setState((current) => ({
      ...current,
      products: current.products.filter((item) => item.id !== product.id)
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
      stock: readNumber(row, ["stock", "Stock", "STOCK", "cantidad", "Cantidad"], 0),
      unlimitedStock:
        readText(row, ["ilimitado", "Ilimitado", "stock_ilimitado", "Stock ilimitado"])
          .toLowerCase()
          .startsWith("s")
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

  function handleScanProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sku = scanProduct.sku.trim();
    const name = scanProduct.name.trim();

    if (!sku || !name) {
      setScanMessage("El codigo SKU y el nombre del producto son obligatorios.");
      return;
    }

    const price = Number(scanProduct.price);
    const stock = Number(scanProduct.stock);

    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0) {
      setScanMessage("Precio y stock deben ser numeros validos.");
      return;
    }

    const newProduct: Product = {
      id: sku,
      sku,
      name,
      concentration: scanProduct.concentration.trim() || "No especificada",
      form: scanProduct.form.trim() || "No especificada",
      category: scanProduct.category.trim() || "Sin categoria",
      price,
      stock,
      unlimitedStock: scanProduct.unlimitedStock
    };

    setState((current) => {
      const exists = current.products.some((product) => product.sku === sku);
      return {
        ...current,
        products: exists
          ? current.products.map((product) =>
              product.sku === sku ? { ...product, ...newProduct } : product
            )
          : [newProduct, ...current.products]
      };
    });

    const existed = state.products.some((product) => product.sku === sku);
    setScanMessage(
      existed
        ? `Producto actualizado por SKU ${sku}.`
        : `Producto agregado por escaneo con SKU ${sku}.`
    );
    setScanProduct({
      sku: "",
      name: "",
      concentration: "",
      form: "",
      category: "",
      price: "",
      stock: "",
      unlimitedStock: false
    });
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

      <section className="scan-product-card">
        <div>
          <span className="eyebrow">Carga por escaneo</span>
          <h3>Añadir producto con codigo de barra</h3>
          <p>
            Usa la pistola lectora en el campo SKU. Luego completa los datos del
            producto y guardalo en la base local del simulador.
          </p>
          <strong>{scanMessage}</strong>
        </div>

        <form className="scan-product-form" onSubmit={handleScanProductSubmit}>
          <label className="full-field">
            SKU / codigo de barra
            <input
              autoComplete="off"
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  sku: event.target.value
                }))
              }
              placeholder="Escanea aqui"
              value={scanProduct.sku}
            />
          </label>
          <label>
            Nombre
            <input
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Ej: Paracetamol"
              value={scanProduct.name}
            />
          </label>
          <label>
            Dosis / concentracion
            <input
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  concentration: event.target.value
                }))
              }
              placeholder="Ej: 500 mg"
              value={scanProduct.concentration}
            />
          </label>
          <label>
            Presentacion
            <input
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  form: event.target.value
                }))
              }
              placeholder="Ej: Caja 16 comprimidos"
              value={scanProduct.form}
            />
          </label>
          <label>
            Categoria
            <input
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  category: event.target.value
                }))
              }
              placeholder="Ej: Analgesico"
              value={scanProduct.category}
            />
          </label>
          <label>
            Precio
            <input
              min="0"
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  price: event.target.value
                }))
              }
              placeholder="0"
              type="number"
              value={scanProduct.price}
            />
          </label>
          <label>
            Stock
            <input
              disabled={scanProduct.unlimitedStock}
              min="0"
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  stock: event.target.value
                }))
              }
              placeholder="0"
              type="number"
              value={scanProduct.stock}
            />
          </label>
          <label className="toggle-field">
            <input
              checked={scanProduct.unlimitedStock}
              onChange={(event) =>
                setScanProduct((current) => ({
                  ...current,
                  unlimitedStock: event.target.checked
                }))
              }
              type="checkbox"
            />
            Stock ilimitado
          </label>
          <div className="scan-product-actions">
            <button className="primary-action" type="submit">
              Guardar producto
            </button>
            <button
              className="secondary-action"
              onClick={() =>
                setScanProduct({
                  sku: "",
                  name: "",
                  concentration: "",
                  form: "",
                  category: "",
                  price: "",
                  stock: "",
                  unlimitedStock: false
                })
              }
              type="button"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Codigo</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Ilimitado</th>
              <th>Categoria</th>
              <th>Accion</th>
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
                    disabled={product.unlimitedStock}
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
                  {product.unlimitedStock && <small>Sin descuento de stock</small>}
                </td>
                <td>
                  <label className="table-toggle">
                    <input
                      checked={Boolean(product.unlimitedStock)}
                      onChange={(event) =>
                        updateProduct(product.id, {
                          unlimitedStock: event.target.checked
                        })
                      }
                      type="checkbox"
                    />
                    <span>{product.unlimitedStock ? "Activo" : "No"}</span>
                  </label>
                </td>
                <td>
                  {product.category}
                </td>
                <td>
                  <button
                    className="danger-action"
                    onClick={() => deleteProduct(product)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

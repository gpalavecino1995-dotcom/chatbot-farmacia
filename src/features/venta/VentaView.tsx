import { FormEvent, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AppState, CartItem, Product } from "../../types";
import { formatMoney } from "../../utils/format";
import {
  buildReceiptUrl,
  createReceiptJpg,
  createReceiptPayload
} from "../../utils/receiptImage";

type VentaViewProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
};

type AlertTone = "info" | "success" | "warning" | "danger";

type PosAlert = {
  tone: AlertTone;
  message: string;
};

type ReceiptPreview = {
  imageUrl: string;
  qrUrl: string;
  receiptUrl: string;
};

function getCartProduct(products: Product[], item: CartItem) {
  return products.find((product) => product.id === item.productId);
}

export function VentaView({ state, setState }: VentaViewProps) {
  const [scanValue, setScanValue] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(
    null
  );
  const [expandedQr, setExpandedQr] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [alert, setAlert] = useState<PosAlert>({
    tone: "info",
    message: "Caja lista para iniciar una venta simulada."
  });

  const cartLines = useMemo(
    () =>
      cart
        .map((item) => {
          const product = getCartProduct(state.products, item);
          if (!product) {
            return null;
          }

          return {
            ...item,
            product,
            subtotal: product.price * item.quantity
          };
        })
        .filter(Boolean),
    [cart, state.products]
  );

  const total = cartLines.reduce((sum, line) => sum + line!.subtotal, 0);
  const activeSeller = state.sellerName.trim();

  function addProduct(product: Product) {
    const currentQuantity =
      cart.find((item) => item.productId === product.id)?.quantity ?? 0;

    if (!product.unlimitedStock && product.stock <= currentQuantity) {
      setAlert({
        tone: "danger",
        message: `Stock insuficiente para ${product.name} ${product.concentration}.`
      });
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) {
        return [...current, { productId: product.id, quantity: 1 }];
      }

      return current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });

    setAlert({
      tone: "success",
      message: `${product.name} agregado al carrito.`
    });
  }

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = scanValue.trim().toLowerCase();
    if (!query) {
      setAlert({ tone: "warning", message: "Ingresa o escanea un codigo." });
      return;
    }

    const product = state.products.find(
      (item) =>
        item.sku.toLowerCase() === query ||
        item.name.toLowerCase().includes(query)
    );

    if (!product) {
      setAlert({
        tone: "danger",
        message: "Producto no encontrado en el inventario simulado."
      });
      return;
    }

    addProduct(product);
    setScanValue("");
  }

  function removeProduct(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
    setAlert({ tone: "info", message: "Producto retirado del carrito." });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      removeProduct(productId);
      return;
    }

    const product = state.products.find((item) => item.id === productId);
    if (product && !product.unlimitedStock && quantity > product.stock) {
      setAlert({
        tone: "danger",
        message: `No hay stock suficiente. Disponible: ${product.stock}.`
      });
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  }

  function finishSale() {
    if (cartLines.length === 0) {
      setAlert({
        tone: "warning",
        message: "Agrega productos antes de finalizar la venta simulada."
      });
      return;
    }

    if (!activeSeller) {
      setAlert({
        tone: "warning",
        message:
          "Antes de finalizar, registra el nombre del vendedor en la pestaña Vendedor."
      });
      return;
    }

    const saleItems = cartLines.map((line) => ({
      productId: line!.product.id,
      name: `${line!.product.name} ${line!.product.concentration}`,
      sku: line!.product.sku,
      quantity: line!.quantity,
      unitPrice: line!.product.price,
      subtotal: line!.subtotal
    }));

    const sale = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sellerName: activeSeller,
      items: saleItems,
      total
    };

    const receiptPayload = createReceiptPayload(sale, state.settings);
    const receiptUrl = buildReceiptUrl(receiptPayload);
    const imageUrl = createReceiptJpg(receiptPayload);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=32&ecc=H&data=${encodeURIComponent(receiptUrl)}`;
    const saleWithReceipt = { ...sale, receiptUrl };

    setState((current) => ({
      ...current,
      products: current.products.map((product) => {
        const sold = cart.find((item) => item.productId === product.id);
        return sold && !product.unlimitedStock
          ? { ...product, stock: product.stock - sold.quantity }
          : product;
      }),
      sales: [saleWithReceipt, ...current.sales]
    }));

    setCart([]);
    setReceiptPreview({ imageUrl, qrUrl, receiptUrl });
    setAlert({
      tone: "success",
      message:
        "Venta simulada finalizada. Indica al paciente simulado que escanee el QR de la boleta ficticia."
    });
  }

  function newSale() {
    setCart([]);
    setScanValue("");
    setReceiptPreview(null);
    setExpandedQr(false);
    setAlert({ tone: "info", message: "Nueva venta simulada iniciada." });
  }

  return (
    <section className="view-stack">
      <header className="section-header">
        <div>
          <span className="eyebrow">Modo estudiante</span>
          <h2>Venta</h2>
          <p>
            Escanea los productos indicados por el paciente simulado y realiza
            la venta siguiendo el protocolo del role play
          </p>
        </div>
        <div className="operator-card">
          <span>Vendedor</span>
          <strong>{activeSeller || "Sin vendedor registrado"}</strong>
        </div>
      </header>

      <div className="pos-grid">
        <section className="scan-panel">
          <form onSubmit={handleScan}>
            <label htmlFor="scan-input">Escaneo de producto</label>
            <div className="scan-input-row">
              <input
                autoComplete="off"
                autoFocus
                id="scan-input"
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="Escanear codigo o escribir nombre"
                value={scanValue}
              />
              <button type="submit">Agregar</button>
            </div>
          </form>

          <div className={`pos-alert ${alert.tone}`} role="status">
            <strong>Alerta</strong>
            <span>{alert.message}</span>
          </div>

          <div className="student-instructions">
            <h3>Instrucciones breves</h3>
            <ul>
              <li>Saluda al paciente simulado y confirma los productos.</li>
              <li>Escanea cada producto o usa los accesos rapidos.</li>
              <li>Revisa alertas antes de finalizar.</li>
              <li>Indica al paciente simulado que escanee el QR de la pantalla.</li>
              <li>Finaliza solo cuando el carrito coincida con el caso.</li>
            </ul>
          </div>

          <div className="quick-products">
            <h3>Productos simulados</h3>
            <div className="product-shortcuts">
              {state.products.map((product) => (
                <button
                  disabled={!product.unlimitedStock && product.stock === 0}
                  key={product.id}
                  onClick={() => addProduct(product)}
                  type="button"
                >
                  <strong>{product.name}</strong>
                  <span>
                    {product.concentration} -{" "}
                    {product.unlimitedStock
                      ? "Stock ilimitado"
                      : `Stock ${product.stock}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="cart-panel" aria-label="Carrito de venta">
          <div className="cart-header">
            <div>
              <span className="eyebrow">Carrito visible</span>
              <h3>Detalle de venta</h3>
            </div>
            <span className="item-count">{cartLines.length} lineas</span>
          </div>

          <div className="cart-lines">
            {cartLines.length === 0 ? (
              <div className="empty-cart">
                <strong>Sin productos</strong>
                <span>Escanea un codigo para comenzar la venta.</span>
              </div>
            ) : (
              cartLines.map((line) => (
                <article className="cart-line" key={line!.product.id}>
                  <div>
                    <strong>
                      {line!.product.name} {line!.product.concentration}
                    </strong>
                    <span>{line!.product.sku}</span>
                  </div>
                  <div className="quantity-control">
                    <button
                      aria-label="Disminuir cantidad"
                      onClick={() =>
                        updateQuantity(line!.product.id, line!.quantity - 1)
                      }
                      type="button"
                    >
                      -
                    </button>
                    <input
                      aria-label="Cantidad"
                      min="1"
                      onChange={(event) =>
                        updateQuantity(
                          line!.product.id,
                          Number(event.target.value)
                        )
                      }
                      type="number"
                      value={line!.quantity}
                    />
                    <button
                      aria-label="Aumentar cantidad"
                      onClick={() =>
                        updateQuantity(line!.product.id, line!.quantity + 1)
                      }
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <strong className="line-subtotal">
                    {formatMoney(line!.subtotal, state.settings.currency)}
                  </strong>
                  <button
                    className="remove-line"
                    onClick={() => removeProduct(line!.product.id)}
                    type="button"
                  >
                    Quitar
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="total-box">
            <span>Total simulado</span>
            <strong>{formatMoney(total, state.settings.currency)}</strong>
          </div>

          {receiptPreview && (
            <section className="receipt-qr-panel" aria-label="Boleta ficticia con QR">
              <div>
                <span className="eyebrow">Boleta ficticia</span>
                <h3>QR para el paciente simulado</h3>
                <p>
                  El estudiante debe pedir al paciente que escanee este codigo
                  desde la pantalla para revisar la boleta ficticia.
                </p>
                <a href={receiptPreview.receiptUrl} rel="noreferrer" target="_blank">
                  Abrir boleta ficticia
                </a>
              </div>
              <button
                className="receipt-qr-button"
                onClick={() => setExpandedQr(true)}
                type="button"
              >
                <img
                  className="receipt-qr"
                  src={receiptPreview.qrUrl}
                  alt="Codigo QR de boleta ficticia"
                />
                <span>Tocar para ampliar</span>
              </button>
              <img
                className="receipt-image-preview"
                src={receiptPreview.imageUrl}
                alt="Vista previa de boleta ficticia"
              />
            </section>
          )}

          {receiptPreview && expandedQr && (
            <div className="qr-modal" role="dialog" aria-modal="true">
              <div className="qr-modal-card">
                <div>
                  <span className="eyebrow">Escaneo del paciente</span>
                  <h3>QR de boleta ficticia</h3>
                  <p>Acerca el celular a la pantalla para escanear.</p>
                </div>
                <img src={receiptPreview.qrUrl} alt="Codigo QR ampliado" />
                <button
                  className="secondary-action"
                  onClick={() => setExpandedQr(false)}
                  type="button"
                >
                  Cerrar QR
                </button>
              </div>
            </div>
          )}

          <div className="sale-actions">
            <button className="primary-action" onClick={finishSale} type="button">
              Finalizar venta simulada
            </button>
            <button className="secondary-action" onClick={newSale} type="button">
              Nueva venta
            </button>
          </div>

          <p className="simulation-note">
            Simulador educativo: no procesa pagos reales, boletas reales,
            recetas electronicas ni conexiones sanitarias.
          </p>
        </section>
      </div>
    </section>
  );
}

import { FormEvent, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AppState, CartItem, Product } from "../../types";
import medicamentos from "../../data/medicamentos.json";
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

type PatientSaleData = {
  patientRut: string;
  healthProvider: "FONASA" | "ISAPRE";
};

type VademecumMedicine = {
  nombre_comercial: string;
  principio_activo: string;
  forma_farmaceutica: string;
  concentracion: string;
  indicacion_general: string;
  advertencias: string;
  contraindicaciones: string;
  interacciones: string;
  condicion_venta: string;
  consejo_dispensacion: string;
};

const PHARMACIST_AUTH_KEY = "AVS3111";
const VADEMECUM_MEDICINES = medicamentos as VademecumMedicine[];

function getCartProduct(products: Product[], item: CartItem) {
  return products.find((product) => product.id === item.productId);
}

export function VentaView({ state, setState }: VentaViewProps) {
  const [scanValue, setScanValue] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<ReceiptPreview | null>(
    null
  );
  const [expandedQr, setExpandedQr] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showRetainedModal, setShowRetainedModal] = useState(false);
  const [showVademecumModal, setShowVademecumModal] = useState(false);
  const [vademecumSearch, setVademecumSearch] = useState("");
  const [retainedAuthorized, setRetainedAuthorized] = useState(false);
  const [pharmacistKey, setPharmacistKey] = useState("");
  const [patientRut, setPatientRut] = useState("");
  const [healthProvider, setHealthProvider] = useState<"" | "FONASA" | "ISAPRE">(
    ""
  );
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
  const retainedPrescriptionLines = cartLines.filter(
    (line) => line!.product.retainedPrescription
  );
  const normalizedVademecumSearch = normalizeSearch(vademecumSearch);
  const vademecumResults =
    normalizedVademecumSearch.length === 0
      ? []
      : VADEMECUM_MEDICINES.filter((medicine) =>
          normalizeSearch(
            `${medicine.nombre_comercial} ${medicine.principio_activo}`
          ).includes(normalizedVademecumSearch)
        );

  function normalizeSearch(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

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
      tone: product.retainedPrescription ? "warning" : "success",
      message: product.retainedPrescription
        ? `${product.name} agregado. Este producto es con receta retenida y requiere atencion del quimico farmaceutico.`
        : `${product.name} agregado al carrito.`
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

    if (retainedPrescriptionLines.length > 0 && !retainedAuthorized) {
      setShowRetainedModal(true);
      setAlert({
        tone: "warning",
        message:
          "Este producto es con receta retenida. Solicita atencion del quimico farmaceutico."
      });
      return;
    }

    if (state.settings.requireCustomerRut) {
      setShowPatientModal(true);
      return;
    }

    completeSale();
  }

  function completeSale(patientData?: PatientSaleData) {
    if (cartLines.length === 0) {
      setAlert({
        tone: "warning",
        message: "Agrega productos antes de finalizar la venta simulada."
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
      patientRut: patientData?.patientRut,
      healthProvider: patientData?.healthProvider,
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
    setPatientRut("");
    setHealthProvider("");
    setShowPatientModal(false);
    setShowRetainedModal(false);
    setRetainedAuthorized(false);
    setPharmacistKey("");
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
    setShowPatientModal(false);
    setShowRetainedModal(false);
    setRetainedAuthorized(false);
    setPharmacistKey("");
    setPatientRut("");
    setHealthProvider("");
    setAlert({ tone: "info", message: "Nueva venta simulada iniciada." });
  }

  function submitPatientData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanRut = patientRut.trim();

    if (!cleanRut) {
      setAlert({ tone: "warning", message: "Ingresa el RUT del paciente." });
      return;
    }

    if (!healthProvider) {
      setAlert({
        tone: "warning",
        message: "Selecciona si el paciente posee FONASA o ISAPRE."
      });
      return;
    }

    completeSale({
      patientRut: cleanRut,
      healthProvider
    });
  }

  function submitRetainedAuthorization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pharmacistKey.trim().toUpperCase() !== PHARMACIST_AUTH_KEY) {
      setAlert({
        tone: "danger",
        message: "Clave incorrecta. La venta requiere autorizacion del quimico farmaceutico."
      });
      return;
    }

    setRetainedAuthorized(true);
    setShowRetainedModal(false);
    setPharmacistKey("");
    setAlert({
      tone: "success",
      message: "Autorizacion registrada. Puedes continuar la venta simulada."
    });

    if (state.settings.requireCustomerRut) {
      setShowPatientModal(true);
      return;
    }

    completeSale();
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

          {state.settings.vademecumEnabled && (
            <section className="vademecum-entry">
              <div>
                <span className="eyebrow">Apoyo docente</span>
                <h3>Consulta farmacologica</h3>
              </div>
              <button
                className="secondary-action"
                onClick={() => setShowVademecumModal(true)}
                type="button"
              >
                Consultar vademécum
              </button>
            </section>
          )}

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

          {showPatientModal && (
            <div className="patient-modal" role="dialog" aria-modal="true">
              <form className="patient-modal-card" onSubmit={submitPatientData}>
                <div>
                  <span className="eyebrow">Datos del paciente</span>
                  <h3>Finalizar venta simulada</h3>
                  <p>
                    Para continuar, solicita el RUT del paciente y consulta su
                    prestador de salud.
                  </p>
                </div>
                <label>
                  RUT del paciente
                  <input
                    autoFocus
                    onChange={(event) => setPatientRut(event.target.value)}
                    placeholder="Ej: 12.345.678-9"
                    type="text"
                    value={patientRut}
                  />
                </label>
                <fieldset>
                  <legend>Prestador de salud</legend>
                  <label>
                    <input
                      checked={healthProvider === "FONASA"}
                      onChange={() => setHealthProvider("FONASA")}
                      type="radio"
                    />
                    FONASA
                  </label>
                  <label>
                    <input
                      checked={healthProvider === "ISAPRE"}
                      onChange={() => setHealthProvider("ISAPRE")}
                      type="radio"
                    />
                    ISAPRE
                  </label>
                </fieldset>
                <div className="patient-modal-actions">
                  <button className="primary-action" type="submit">
                    Continuar venta
                  </button>
                  <button
                    className="secondary-action"
                    onClick={() => setShowPatientModal(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {showRetainedModal && (
            <div className="patient-modal" role="dialog" aria-modal="true">
              <form
                className="patient-modal-card retained-modal-card"
                onSubmit={submitRetainedAuthorization}
              >
                <div>
                  <span className="eyebrow">Receta retenida</span>
                  <h3>Atencion del quimico farmaceutico</h3>
                  <p>
                    Este producto es con receta retenida. Para continuar la
                    venta simulada, solicita autorizacion e ingresa la clave del
                    programa.
                  </p>
                </div>
                <div className="retained-product-list">
                  {retainedPrescriptionLines.map((line) => (
                    <strong key={line!.product.id}>
                      {line!.product.name} {line!.product.concentration}
                    </strong>
                  ))}
                </div>
                <label>
                  Clave de autorizacion
                  <input
                    autoFocus
                    onChange={(event) => setPharmacistKey(event.target.value)}
                    placeholder="Clave del programa"
                    type="password"
                    value={pharmacistKey}
                  />
                </label>
                <div className="patient-modal-actions">
                  <button className="primary-action" type="submit">
                    Autorizar y continuar
                  </button>
                  <button
                    className="secondary-action"
                    onClick={() => setShowRetainedModal(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {showVademecumModal && (
            <div className="patient-modal" role="dialog" aria-modal="true">
              <div className="patient-modal-card vademecum-modal-card">
                <div>
                  <span className="eyebrow">Consulta educativa</span>
                  <h3>Vademécum</h3>
                  <p>
                    Revisa informacion de apoyo para orientar la atencion
                    farmacéutica simulada.
                  </p>
                </div>

                <section className="vademecum-external">
                  <div>
                    <strong>Abrir vademécum externo</strong>
                    <span>Consulta una fuente externa en una nueva pestaña.</span>
                  </div>
                  <a
                    className="primary-action"
                    href="https://www.colegiofarmaceutico.cl/MFT/MFT.HTM"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Abrir vademécum externo
                  </a>
                </section>

                <section className="vademecum-internal">
                  <div>
                    <span className="eyebrow">Vademécum interno</span>
                    <h4>Buscar medicamento</h4>
                  </div>
                  <label>
                    Nombre comercial o principio activo
                    <input
                      autoComplete="off"
                      onChange={(event) => setVademecumSearch(event.target.value)}
                      placeholder="Ej: paracetamol, ibuprofeno"
                      value={vademecumSearch}
                    />
                  </label>

                  <div className="vademecum-results">
                    {normalizedVademecumSearch.length > 0 &&
                      vademecumResults.length === 0 && (
                        <div className="empty-vademecum">
                          No se encontró información para este medicamento en el
                          vademécum interno.
                        </div>
                      )}

                    {vademecumResults.map((medicine) => (
                      <article
                        className="vademecum-result"
                        key={`${medicine.nombre_comercial}-${medicine.concentracion}`}
                      >
                        <h4>{medicine.nombre_comercial}</h4>
                        <dl>
                          <div>
                            <dt>Principio activo</dt>
                            <dd>{medicine.principio_activo}</dd>
                          </div>
                          <div>
                            <dt>Forma farmaceutica</dt>
                            <dd>{medicine.forma_farmaceutica}</dd>
                          </div>
                          <div>
                            <dt>Concentracion</dt>
                            <dd>{medicine.concentracion}</dd>
                          </div>
                          <div>
                            <dt>Indicacion general</dt>
                            <dd>{medicine.indicacion_general}</dd>
                          </div>
                          <div>
                            <dt>Advertencias</dt>
                            <dd>{medicine.advertencias}</dd>
                          </div>
                          <div>
                            <dt>Contraindicaciones</dt>
                            <dd>{medicine.contraindicaciones}</dd>
                          </div>
                          <div>
                            <dt>Interacciones</dt>
                            <dd>{medicine.interacciones}</dd>
                          </div>
                          <div>
                            <dt>Condicion de venta</dt>
                            <dd>{medicine.condicion_venta}</dd>
                          </div>
                          <div>
                            <dt>Consejo de dispensacion</dt>
                            <dd>{medicine.consejo_dispensacion}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </section>

                <button
                  className="secondary-action"
                  onClick={() => setShowVademecumModal(false)}
                  type="button"
                >
                  Cerrar vademécum
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

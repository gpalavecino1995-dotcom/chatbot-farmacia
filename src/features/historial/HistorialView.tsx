import type { AppState } from "../../types";
import { formatDate, formatMoney } from "../../utils/format";

type HistorialViewProps = {
  state: AppState;
};

export function HistorialView({ state }: HistorialViewProps) {
  return (
    <section className="view-stack">
      <header className="section-header">
        <div>
          <span className="eyebrow">Registro local</span>
          <h2>Historial</h2>
          <p>Ventas simuladas guardadas en este navegador.</p>
        </div>
      </header>

      <div className="history-list">
        {state.sales.length === 0 ? (
          <div className="empty-state">
            <strong>No hay ventas registradas.</strong>
            <span>Finaliza una venta simulada para verla aqui.</span>
          </div>
        ) : (
          state.sales.map((sale) => (
            <article className="history-card" key={sale.id}>
              <div className="history-card-header">
                <div>
                  <strong>Venta {sale.id.slice(0, 8)}</strong>
                  <span>{formatDate(sale.createdAt)}</span>
                  <span>
                    {sale.receiptUrl
                      ? "Boleta ficticia QR generada"
                      : "Sin QR registrado"}
                  </span>
                </div>
                <strong>{formatMoney(sale.total, state.settings.currency)}</strong>
              </div>
              <ul>
                {sale.items.map((item) => (
                  <li key={`${sale.id}-${item.productId}`}>
                    {item.quantity} x {item.name} ·{" "}
                    {formatMoney(item.subtotal, state.settings.currency)}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

import { FormEvent, useState } from "react";
import type { AppSettings } from "../../types";

type ConfiguracionViewProps = {
  settings: AppSettings;
  onReset: () => void;
  onSave: (settings: AppSettings) => void;
};

export function ConfiguracionView({
  settings,
  onReset,
  onSave
}: ConfiguracionViewProps) {
  const [draft, setDraft] = useState(settings);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <section className="view-stack">
      <header className="section-header">
        <div>
          <span className="eyebrow">Preparacion</span>
          <h2>Configuracion</h2>
          <p>Ajusta datos visibles para la sesion de simulacion.</p>
        </div>
      </header>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          Nombre de farmacia
          <input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                pharmacyName: event.target.value
              }))
            }
            value={draft.pharmacyName}
          />
        </label>
        <label>
          Nombre de cajero
          <input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                cashierName: event.target.value
              }))
            }
            value={draft.cashierName}
          />
        </label>
        <label>
          Moneda
          <select
            onChange={(event) =>
              setDraft((current) => ({ ...current, currency: event.target.value }))
            }
            value={draft.currency}
          >
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label>
          Umbral de alerta de stock
          <input
            min="0"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lowStockThreshold: Number(event.target.value)
              }))
            }
            type="number"
            value={draft.lowStockThreshold}
          />
        </label>
        <label className="settings-toggle">
          <input
            checked={draft.requireCustomerRut}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                requireCustomerRut: event.target.checked
              }))
            }
            type="checkbox"
          />
          Solicitar RUT cliente y prestador de salud al finalizar venta
        </label>
        <div className="settings-actions">
          <button className="primary-action" type="submit">
            Guardar configuracion
          </button>
          <button className="secondary-action" onClick={onReset} type="button">
            Restaurar datos demo
          </button>
        </div>
      </form>
    </section>
  );
}

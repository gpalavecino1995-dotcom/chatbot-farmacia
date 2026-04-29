import { FormEvent, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AppState } from "../../types";

type VendedorViewProps = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
};

export function VendedorView({ state, setState }: VendedorViewProps) {
  const [sellerName, setSellerName] = useState(state.sellerName);
  const [message, setMessage] = useState(
    state.sellerName
      ? `Caja abierta para ${state.sellerName}.`
      : "Registra el nombre del estudiante antes de iniciar la venta."
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = sellerName.trim();

    if (!cleanName) {
      setMessage("Ingresa el nombre del estudiante vendedor.");
      return;
    }

    setState((current) => ({ ...current, sellerName: cleanName }));
    setMessage(`Caja abierta para ${cleanName}.`);
  }

  function clearSeller() {
    setSellerName("");
    setState((current) => ({ ...current, sellerName: "" }));
    setMessage("Caja cerrada. Registra un vendedor para una nueva sesion.");
  }

  return (
    <section className="view-stack">
      <header className="section-header">
        <div>
          <span className="eyebrow">Apertura de caja</span>
          <h2>Vendedor</h2>
          <p>
            Registra el nombre del estudiante que atendera la caja simulada.
            Este dato aparecera en la venta y en la boleta ficticia.
          </p>
        </div>
      </header>

      <section className="seller-card">
        <div>
          <span className="eyebrow">Registro de atencion</span>
          <h3>Datos del vendedor</h3>
          <p>
            Antes de iniciar una atencion, el estudiante debe identificarse para
            que la operacion quede asociada a su nombre.
          </p>
          <strong>{message}</strong>
        </div>

        <form className="seller-form" onSubmit={handleSubmit}>
          <label>
            Nombre del estudiante
            <input
              autoComplete="name"
              onChange={(event) => setSellerName(event.target.value)}
              placeholder="Ej: Nombre Apellido"
              value={sellerName}
            />
          </label>
          <div className="seller-actions">
            <button className="primary-action" type="submit">
              Abrir caja
            </button>
            <button
              className="secondary-action"
              onClick={clearSeller}
              type="button"
            >
              Cerrar caja
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

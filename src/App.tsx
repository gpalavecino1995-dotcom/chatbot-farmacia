import { useEffect, useMemo, useState } from "react";
import { initialState } from "./data/seedData";
import { clearState, loadState, saveState } from "./storage";
import type { AppSettings, AppState, SectionId } from "./types";
import { ConfiguracionView } from "./features/configuracion/ConfiguracionView";
import { HistorialView } from "./features/historial/HistorialView";
import { InventarioView } from "./features/inventario/InventarioView";
import { VentaView } from "./features/venta/VentaView";

const sections: Array<{ id: SectionId; label: string }> = [
  { id: "venta", label: "Venta" },
  { id: "inventario", label: "Inventario" },
  { id: "historial", label: "Historial" },
  { id: "configuracion", label: "Configuracion" }
];

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("venta");
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const lowStockCount = useMemo(
    () =>
      state.products.filter(
        (product) => product.stock <= state.settings.lowStockThreshold
      ).length,
    [state.products, state.settings.lowStockThreshold]
  );

  function updateSettings(settings: AppSettings) {
    setState((current) => ({ ...current, settings }));
  }

  function resetDemoData() {
    clearState();
    setState(initialState);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="duoc-logo-card" aria-label="Duoc UC">
            <img src="./duoc-uc-logo.png" alt="Duoc UC" />
          </div>
          <span className="brand-kicker">Uso docente</span>
          <h1>POS Farmacia Duoc UC</h1>
          <p>Caja simulada para farmacia comunitaria y role play.</p>
        </div>

        <nav className="main-nav" aria-label="Secciones principales">
          {sections.map((section) => (
            <button
              className={activeSection === section.id ? "active" : ""}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span>{state.settings.pharmacyName}</span>
          <strong>{lowStockCount} alertas de stock</strong>
        </div>
      </aside>

      <main className="main-panel">
        {activeSection === "venta" && (
          <VentaView state={state} setState={setState} />
        )}
        {activeSection === "inventario" && (
          <InventarioView state={state} setState={setState} />
        )}
        {activeSection === "historial" && <HistorialView state={state} />}
        {activeSection === "configuracion" && (
          <ConfiguracionView
            settings={state.settings}
            onReset={resetDemoData}
            onSave={updateSettings}
          />
        )}
      </main>
    </div>
  );
}

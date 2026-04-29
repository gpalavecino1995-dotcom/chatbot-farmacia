import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { initialState } from "./data/seedData";
import { clearState, loadState, saveState } from "./storage";
import type { AppSettings, AppState, SectionId } from "./types";
import { ConfiguracionView } from "./features/configuracion/ConfiguracionView";
import { HistorialView } from "./features/historial/HistorialView";
import { InventarioView } from "./features/inventario/InventarioView";
import { VentaView } from "./features/venta/VentaView";
import { createReceiptJpg, parseReceiptPayload } from "./utils/receiptImage";

const sections: Array<{ id: SectionId; label: string }> = [
  { id: "venta", label: "Venta" },
  { id: "inventario", label: "Inventario" },
  { id: "historial", label: "Historial" },
  { id: "configuracion", label: "Configuracion" }
];

const TEACHER_ACCESS_KEY = "AVS3111";
const protectedSections: SectionId[] = ["inventario", "configuracion"];

export default function App() {
  const publicReceipt = parseReceiptPayload(
    new URLSearchParams(window.location.search).get("b") ??
      new URLSearchParams(window.location.search).get("boleta")
  );
  const [activeSection, setActiveSection] = useState<SectionId>("venta");
  const [teacherAccess, setTeacherAccess] = useState(false);
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

  if (publicReceipt) {
    return <PublicReceiptView imageUrl={createReceiptJpg(publicReceipt)} />;
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
              {protectedSections.includes(section.id) && !teacherAccess && (
                <span className="nav-lock">Clave</span>
              )}
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
          <ProtectedSection
            isUnlocked={teacherAccess}
            onUnlock={() => setTeacherAccess(true)}
            sectionName="Inventario"
          >
            <InventarioView state={state} setState={setState} />
          </ProtectedSection>
        )}
        {activeSection === "historial" && <HistorialView state={state} />}
        {activeSection === "configuracion" && (
          <ProtectedSection
            isUnlocked={teacherAccess}
            onUnlock={() => setTeacherAccess(true)}
            sectionName="Configuracion"
          >
            <ConfiguracionView
              settings={state.settings}
              onReset={resetDemoData}
              onSave={updateSettings}
            />
          </ProtectedSection>
        )}
      </main>
    </div>
  );
}

type PublicReceiptViewProps = {
  imageUrl: string;
};

function PublicReceiptView({ imageUrl }: PublicReceiptViewProps) {
  return (
    <main className="public-receipt-page">
      <section className="public-receipt-card">
        <span className="eyebrow">Boleta ficticia</span>
        <h1>POS Farmacia Duoc UC</h1>
        <p>
          Imagen generada para actividad educativa. No corresponde a una venta
          real ni a un documento tributario.
        </p>
        <img src={imageUrl} alt="Boleta ficticia POS Farmacia Duoc UC" />
      </section>
    </main>
  );
}

type ProtectedSectionProps = {
  children: ReactNode;
  isUnlocked: boolean;
  onUnlock: () => void;
  sectionName: string;
};

function ProtectedSection({
  children,
  isUnlocked,
  onUnlock,
  sectionName
}: ProtectedSectionProps) {
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");

  if (isUnlocked) {
    return children;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accessKey.trim().toUpperCase() === TEACHER_ACCESS_KEY) {
      setError("");
      setAccessKey("");
      onUnlock();
      return;
    }

    setError("Clave incorrecta. Solicita la clave docente de la clase.");
  }

  return (
    <section className="protected-panel">
      <div className="protected-card">
        <span className="eyebrow">Acceso docente</span>
        <h2>{sectionName} bloqueado</h2>
        <p>
          Esta seccion permite modificar datos del simulador. Ingresa la clave
          de la clase para continuar.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="teacher-access-key">Clave de clase</label>
          <input
            autoComplete="off"
            id="teacher-access-key"
            onChange={(event) => setAccessKey(event.target.value)}
            placeholder="Ej: AVS3111"
            type="password"
            value={accessKey}
          />
          {error && <strong className="access-error">{error}</strong>}
          <button className="primary-action" type="submit">
            Desbloquear
          </button>
        </form>
      </div>
    </section>
  );
}

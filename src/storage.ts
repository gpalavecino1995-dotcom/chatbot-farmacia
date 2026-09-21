import { initialState } from "./data/seedData";
import type { AppState } from "./types";

const STORAGE_KEY = "simulador-pos-farmacia:v1";

export function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initialState;
    }

    const parsed = JSON.parse(saved) as Partial<AppState>;
    const savedPharmacyName = parsed.settings?.pharmacyName;
    const pharmacyName =
      savedPharmacyName === "Centro de Simulacion Duoc UC" ||
      savedPharmacyName === "Centro de Simulación Duoc UC"
        ? initialState.settings.pharmacyName
        : savedPharmacyName ?? initialState.settings.pharmacyName;

    return {
      ...initialState,
      ...parsed,
      settings: {
        ...initialState.settings,
        ...parsed.settings,
        pharmacyName
      },
      sellerName: parsed.sellerName ?? initialState.sellerName
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

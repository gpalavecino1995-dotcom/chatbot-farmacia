import { initialState } from "./data/seedData";
import type { AppState } from "./types";

const STORAGE_KEY = "simulador-pos-farmacia:v1";

export function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initialState;
    }

    return {
      ...initialState,
      ...JSON.parse(saved)
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

import { STORAGE_KEY_ROUTES } from "../config.js";

export function loadLocalRoutes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROUTES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalRoutes(routes) {
  try {
    localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
  } catch {
    // silencioso (localStorage cheio)
  }
}
import { STORAGE_KEY_ROUTES } from "./config.js";

export function loadLocalRoutes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROUTES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler localStorage", e);
    return [];
  }
}

export function persistLocalRoutes(routes) {
  try {
    localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
  } catch (e) {
    console.error("Erro ao gravar no localStorage", e);
  }
}

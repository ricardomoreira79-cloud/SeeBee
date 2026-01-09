import { state } from "../state.js";

export function getOnline() {
  return navigator.onLine;
}

export function initNetworkListeners({ onOnline, onOffline } = {}) {
  state.isOnline = getOnline();

  window.addEventListener("online", async () => {
    state.isOnline = true;
    onOnline && (await onOnline());
  });

  window.addEventListener("offline", () => {
    state.isOnline = false;
    onOffline && onOffline();
  });
}
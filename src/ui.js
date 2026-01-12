import { state } from "./state.js";

export function $(id) {
  return document.getElementById(id);
}

export function setMsg(el, text, kind = "") {
  if (!el) return;
  el.classList.remove("error", "ok");
  if (kind) el.classList.add(kind);
  el.textContent = text || "";
}

export function showAuthView() {
  $("authView").hidden = false;
  $("appView").hidden = true;

  $("btnLogout").hidden = true;
  $("userPill").hidden = true;
  $("userEmail").textContent = "";
}

export function showAppView() {
  $("authView").hidden = true;
  $("appView").hidden = false;

  $("btnLogout").hidden = false;
  $("userPill").hidden = false;
  $("userEmail").textContent = state.session?.user?.email || "";
}

export function setRouteHint(text) {
  const el = $("routeHint");
  if (el) el.textContent = text || "";
}

export function setPosText(lat, lng) {
  $("posValue").textContent = (lat && lng) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "-";
}

export function setDistanceText(meters) {
  const m = Math.round(meters || 0);
  $("distValue").textContent = m < 1000 ? `${m} m` : `${(m/1000).toFixed(2)} km`;
}

export function enableRouteButtons(isRecording) {
  $("btnStartRoute").disabled = !!isRecording;
  $("btnFinishRoute").disabled = !isRecording;
  $("btnMarkNest").disabled = !isRecording;
}

import { state } from "./state.js";
import { CONFIG } from "./config.js";

export function initMap() {
  if (state.mapReady) return;

  state.map = L.map("map", { zoomControl: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);

  // fallback inicial
  state.map.setView([-15.6, -56.1], CONFIG.MAP.defaultZoom);

  state.polyline = L.polyline([], { weight: 5 }).addTo(state.map);

  state.mapReady = true;
}

export function setMapCenter(lat, lng, zoom = null) {
  if (!state.mapReady) return;
  state.map.setView([lat, lng], zoom ?? state.map.getZoom());
}

export function addRoutePoint(lat, lng) {
  if (!state.polyline) return;
  state.polyline.addLatLng([lat, lng]);
}

export function addNestMarker(lat, lng) {
  if (!state.mapReady) return;
  L.marker([lat, lng]).addTo(state.map);
}

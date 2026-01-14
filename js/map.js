// js/map.js
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map").setView([-15.6, -56.1], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(state.map);
  state.polyline = L.polyline([], { color: '#22c55e', weight: 5 }).addTo(state.map);
  state.mapReady = true;
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

// ESTA É A FUNÇÃO QUE ESTAVA FALTANDO E TRAVANDO O APP
export function addMarker(lat, lng, color = "orange", label = "") {
  const icon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>`,
    iconSize: [12, 12]
  });
  L.marker([lat, lng], { icon }).addTo(state.map).bindPopup(label);
}

export function clearMap() {
  if (state.polyline) state.polyline.setLatLngs([]);
}
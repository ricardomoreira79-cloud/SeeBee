// js/map.js
import { state } from "./state.js";
import { CONFIG } from "./config.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map").setView([-15.6, -56.1], CONFIG.MAP.defaultZoom || 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
  state.polyline = L.polyline([], { color: '#22c55e', weight: 5 }).addTo(state.map);
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

// CORREÇÃO: Exportando addMarker para o main.js
export function addMarker(lat, lng, color = "#22c55e", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:${color}; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14]
  });
  L.marker([lat, lng], { icon }).addTo(state.map).bindPopup(label);
}

// CORREÇÃO: Exportando clearMapLayers para o routes.js
export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
}
// js/map.js
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  // Inicia o mapa (sem controle de zoom para ficar limpo no mobile)
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
  
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  // ZOOM AUTOMÁTICO AO ABRIR (Correção solicitada)
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16]
  });
  L.marker([lat, lng], { icon }).addTo(state.map).bindPopup(label);
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
}
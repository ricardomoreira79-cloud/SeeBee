// js/map.js
import { state } from "./state.js";
import { CONFIG } from "./config.js";

export function initMap() {
  if (state.mapReady) return;

  state.map = L.map("map", { zoomControl: false }); // ZoomControl false pra ficar mais limpo no mobile
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);

  state.map.setView([-15.6, -56.1], CONFIG.MAP.defaultZoom || 15);
  state.polyline = L.polyline([], { weight: 5, color: '#22c55e' }).addTo(state.map);
  state.nestsLayerGroup = L.layerGroup().addTo(state.map); // Grupo para ninhos

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

// CORREÇÃO: Função genérica para atender main.js e routes.js
export function addNestMarker(lat, lng) {
  if (!state.mapReady) return;
  L.marker([lat, lng]).addTo(state.nestsLayerGroup);
}
// Alias para compatibilidade
export const addMarker = addNestMarker; 

export function updateUserMarker(lat, lng) {
  if (!state.map) return;
  if (!state.userMarker) {
    state.userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1 }).addTo(state.map);
  } else {
    state.userMarker.setLatLng([lat, lng]);
  }
}

// CORREÇÃO: Função genérica para limpar
export function resetMapOverlays() {
  if (state.polyline) state.polyline.setLatLngs([]);
  if (state.nestsLayerGroup) state.nestsLayerGroup.clearLayers();
}
// Alias para compatibilidade com routes.js
export const clearMapLayers = resetMapOverlays;

export function drawRouteOnMap(route) {
  resetMapOverlays();
  if (!route?.path?.length) return;
  
  const latlngs = route.path.map(p => [p.lat, p.lng]);
  state.polyline.setLatLngs(latlngs);
  state.map.fitBounds(state.polyline.getBounds());
}
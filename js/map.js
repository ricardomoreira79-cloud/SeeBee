// js/map.js - ARQUIVO COMPLETO (Correção Visual)
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: ''
  }).addTo(state.map);
  
  // Cria a camada da linha (Polyline)
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  // Zoom forte inicial
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

// Apenas desenha a linha (NÃO cria bolinhas)
export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

// Adiciona Marcador (Início, Fim, Ninho) - Centralizado
export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8], // Centro exato
    popupAnchor: [0, -10]
  });
  
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
  state.map.eachLayer((layer) => {
    // Remove tudo que não for o mapa base e não for a linha
    if (layer !== state.polyline && !(layer instanceof L.TileLayer)) {
      state.map.removeLayer(layer);
    }
  });
}
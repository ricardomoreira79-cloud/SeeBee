// js/map.js - ARQUIVO COMPLETO v16 (SEM BOLINHAS)
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(state.map);
  // Linha do trajeto
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

// ESTE ERA O CULPADO: Agora só adiciona na linha, nada de marcador!
export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

// Cria marcadores (apenas Início, Fim e Ninhos)
export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Centro exato
    popupAnchor: [0, -15]
  });
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
  state.map.eachLayer((layer) => {
    // Remove tudo que não for o mapa base nem a linha
    if (layer !== state.polyline && !(layer instanceof L.TileLayer)) {
      state.map.removeLayer(layer);
    }
  });
}
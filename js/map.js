// js/map.js - ARQUIVO COMPLETO (Limpeza Profunda e Pinos Centralizados)
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: ''
  }).addTo(state.map);
  
  // Cria a linha vazia
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  // Zoom inicial
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

// Adiciona ponto apenas na linha (sem bolinha)
export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

// Adiciona Marcador (Início, Fim, Ninho)
export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Centraliza perfeitamente
    popupAnchor: [0, -15]
  });
  
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

// FUNÇÃO DE LIMPEZA REFORÇADA
export function clearMapLayers() {
  // Limpa a linha
  if (state.polyline) state.polyline.setLatLngs([]);
  
  // Remove TODOS os marcadores e polígonos, mantendo apenas o mapa base
  state.map.eachLayer((layer) => {
    // Se não for o mapa base (TileLayer) e não for a nossa linha principal
    if (layer !== state.polyline && !(layer instanceof L.TileLayer)) {
      state.map.removeLayer(layer);
    }
  });
}
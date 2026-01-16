// js/map.js - CORREÇÃO CIRÚRGICA (SÓ O RISCO)
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  // Inicia o mapa
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: ''
  }).addTo(state.map);
  
  // CAMADA DA LINHA (VERMELHA)
  state.polyline = L.polyline([], { color: '#ef4444', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  // Força zoom inicial
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

// AQUI ESTAVA O ERRO: Esta função desenhava bolinhas.
// Agora ela APENAS adiciona o ponto na linha.
export function addRoutePoint(lat, lng) {
  if (state.polyline) {
    state.polyline.addLatLng([lat, lng]);
    // Mantém o mapa centralizado no usuário enquanto anda
    if(state.map) state.map.panTo([lat, lng]);
  }
}

// Função separada para quando REALMENTE quisermos um ícone (Início, Fim, Ninho)
export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9], // Centralizado
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
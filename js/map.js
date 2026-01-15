// js/map.js - ARQUIVO COMPLETO (Marcadores Corrigidos)
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  // Inicia o mapa (Zoom 18 para ver perto)
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: ''
  }).addTo(state.map);
  
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

export function addMarker(lat, lng, color = "#10b981", label = "") {
  // CONFIGURAÇÃO CRÍTICA PARA O PINO NÃO FICAR BAGUNÇADO
  const icon = L.divIcon({
    className: 'custom-pin', // Classe vazia, estilo vai no html abaixo
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [20, 20],   // Tamanho do quadrado do ícone
    iconAnchor: [10, 10], // Ponto exato do GPS (metade do tamanho)
    popupAnchor: [0, -15] // Onde o balão de texto abre
  });
  
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
  state.map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      state.map.removeLayer(layer);
    }
  });
}
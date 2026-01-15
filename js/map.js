// js/map.js - ARQUIVO COMPLETO
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: ''
  }).addTo(state.map);
  
  state.polyline = L.polyline([], { color: '#10b981', weight: 5 }).addTo(state.map);
  state.mapReady = true;

  // Zoom inicial agressivo (18)
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

export function addMarker(lat, lng, color = "#10b981", label = "") {
  // CORREÇÃO DOS PINOS SAMBANDO
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
    iconAnchor: [9, 9] // Metade do tamanho para centrar
  });
  
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
  // Remove marcadores antigos (exceto o mapa base e linha)
  state.map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      state.map.removeLayer(layer);
    }
  });
}
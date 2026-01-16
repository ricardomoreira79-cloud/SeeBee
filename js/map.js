// js/map.js - ARQUIVO COMPLETO v19
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(state.map);
  // Linha VERMELHA
  state.polyline = L.polyline([], { color: '#ef4444', weight: 5, opacity: 0.8 }).addTo(state.map);
  state.mapReady = true;
  state.map.locate({ setView: true, maxZoom: 18 });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

// SÓ A LINHA, SEM BOLINHAS
export function addRoutePoint(lat, lng) {
  if (state.polyline) {
    state.polyline.addLatLng([lat, lng]);
    if(state.map) state.map.panTo([lat, lng]);
  }
}

export function addMarker(lat, lng, color = "#10b981", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10], 
    popupAnchor: [0, -15]
  });
  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

export function clearMapLayers() {
  if (state.polyline) state.polyline.setLatLngs([]);
  state.map.eachLayer((layer) => {
    // Remove tudo que não for o TileLayer nem a linha
    if (layer !== state.polyline && !(layer instanceof L.TileLayer)) {
      state.map.removeLayer(layer);
    }
  });
}
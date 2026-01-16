// js/map.js - ARQUIVO COMPLETO v17 (compatível com main.js)
// Mantém a linha do trajeto (SEM bolinhas) e adiciona exports que o main espera.
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;

  state.map = L.map("map", { zoomControl: false }).setView([-15.6, -56.1], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
  }).addTo(state.map);

  // Linha do trajeto
  state.polyline = L.polyline([], { color: "#10b981", weight: 5 }).addTo(state.map);

  state.mapReady = true;

  // Evita travar o app se geolocalização falhar/for negada
  try {
    state.map.locate({ setView: true, maxZoom: 18, watch: false, enableHighAccuracy: true });
  } catch (e) {
    console.warn("[map] locate() falhou:", e);
  }

  // Logs úteis (não muda layout)
  state.map.on("locationerror", (err) => {
    console.warn("[map] Erro de localização:", err);
  });
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady && state.map) state.map.setView([lat, lng], zoom);
}

// Trajeto: adiciona ponto apenas na linha, sem marcador
export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

// Marcador genérico (usado para início/fim/ninho)
export function addMarker(lat, lng, color = "#10b981", label = "") {
  if (!state.mapReady || !state.map) return null;

  const icon = L.divIcon({
    className: "custom-pin",
    html: `<div style="
      background-color:${color};
      width:20px; height:20px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 5px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -15],
  });

  const marker = L.marker([lat, lng], { icon }).addTo(state.map);
  if (label) marker.bindPopup(label);
  return marker;
}

/**
 * ✅ COMPAT: o main.js da sua versão usa addNestMarker()
 * Mantemos como “apelido” de addMarker.
 */
export function addNestMarker(lat, lng, label = "Ninho") {
  // cor levemente diferente para ninho (mantém seu tema verde)
  return addMarker(lat, lng, "#22c55e", label);
}

/**
 * Limpa tudo (trajeto e marcadores), preservando tile layer e polyline.
 */
export function clearMapLayers() {
  if (!state.mapReady || !state.map) return;

  if (state.polyline) state.polyline.setLatLngs([]);

  state.map.eachLayer((layer) => {
    // remove tudo que não for mapa base nem a linha
    if (layer !== state.polyline && !(layer instanceof L.TileLayer)) {
      state.map.removeLayer(layer);
    }
  });
}

/**
 * ✅ COMPAT: algumas versões antigas chamavam resetMapOverlays()
 * Mantemos como alias.
 */
export function resetMapOverlays() {
  clearMapLayers();
}

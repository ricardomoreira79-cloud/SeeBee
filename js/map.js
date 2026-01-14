// js/map.js
import { state } from "./state.js";
import { CONFIG } from "./config.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map").setView([-15.6, -56.1], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(state.map);
  state.polyline = L.polyline([], { color: '#22c55e', weight: 5 }).addTo(state.map);
  state.mapReady = true;
}

export function setMapCenter(lat, lng) {
  if (state.mapReady) state.map.setView([lat, lng]);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

export function resetMapOverlays() {
  if (state.polyline) state.polyline.setLatLngs([]);
}
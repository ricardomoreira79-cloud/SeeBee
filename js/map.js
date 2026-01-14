// js/map.js
import { state } from "./state.js";

export function initMap() {
  if (state.mapReady) return;
  state.map = L.map("map").setView([-15.60, -56.09], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(state.map);
  state.polyline = L.polyline([], { color: '#22c55e', weight: 6 }).addTo(state.map);
  state.mapReady = true;
}

export function setMapCenter(lat, lng, zoom = 18) {
  if (state.mapReady) state.map.setView([lat, lng], zoom);
}

export function addRoutePoint(lat, lng) {
  if (state.polyline) state.polyline.addLatLng([lat, lng]);
}

export function addMarker(lat, lng, color = "#22c55e", label = "") {
  const icon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:${color}; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 8px rgba(0,0,0,0.5)"></div>`,
    iconSize: [16, 16]
  });
  L.marker([lat, lng], { icon }).addTo(state.map).bindPopup(label);
}

export function clearMap() {
  if (state.polyline) state.polyline.setLatLngs([]);
}
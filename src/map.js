import { State } from "./state.js";

export function initMap() {
  const map = L.map("map", { zoomControl: true }).setView([-15.61, -56.17], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  State.map = map;
}

export function setRoutePolyline(latlngs){
  if (!State.map) return;

  if (!State.routeLine){
    State.routeLine = L.polyline(latlngs, { weight: 5 }).addTo(State.map);
  } else {
    State.routeLine.setLatLngs(latlngs);
  }
}

export function addNestMarker(lat, lng, label="Ninho"){
  if (!State.map) return;
  L.marker([lat, lng]).addTo(State.map).bindPopup(label);
}

export function panTo(lat, lng){
  if (!State.map) return;
  State.map.panTo([lat, lng], { animate: true });
}

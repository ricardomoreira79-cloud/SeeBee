import { state } from "./state.js";
import { ui } from "./ui.js";

let map;
let userMarker;
let routeLine;

export function initMap() {
  map = L.map("map", { zoomControl: true }).setView([-15.614, -56.175], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  userMarker = L.marker([-15.614, -56.175]).addTo(map).bindPopup("Você");

  routeLine = L.polyline([], { weight: 4 }).addTo(map);
}

export function setUserPosition(lat, lng, { pan = false } = {}) {
  userMarker.setLatLng([lat, lng]);
  if (pan) map.setView([lat, lng], map.getZoom());
}

export function resetRouteLine() {
  routeLine.setLatLngs([]);
}

export function addRoutePoint(lat, lng) {
  const latlngs = routeLine.getLatLngs();
  latlngs.push([lat, lng]);
  routeLine.setLatLngs(latlngs);
}

export function addNestMarker(lat, lng, status = "CATALOGADO") {
  const icon = L.divIcon({
    className: "nestPin",
    html: `<div style="
      width:14px;height:14px;border-radius:999px;
      background:${status === "CAPTURADO" ? "#ffd166" : "#36d77f"};
      border:2px solid rgba(0,0,0,.35);
      box-shadow: 0 10px 24px rgba(0,0,0,.35);
    "></div>`
  });

  L.marker([lat, lng], { icon }).addTo(map);
}

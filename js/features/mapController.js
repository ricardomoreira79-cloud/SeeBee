import { state } from "../state.js";

export function initMap() {
  state.map = L.map("map");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);

  state.nestsLayer = L.layerGroup().addTo(state.map);

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.map.setView([latitude, longitude], 17);
        updateUserMarker(latitude, longitude);
        setGpsText("GPS: sinal ok");
      },
      () => {
        state.map.setView([-15.601, -56.097], 13);
        setGpsText("GPS: não autorizado");
      }
    );
  } else {
    state.map.setView([-15.601, -56.097], 13);
    setGpsText("GPS: não disponível");
  }
}

export function updateUserMarker(lat, lng) {
  if (!state.map) return;
  if (!state.userMarker) {
    state.userMarker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#22c55e",
      fillColor: "#22c55e",
      fillOpacity: 0.9,
    }).addTo(state.map);
  } else {
    state.userMarker.setLatLng([lat, lng]);
  }
}

export function clearRouteLayers() {
  if (state.pathLayer) {
    state.map.removeLayer(state.pathLayer);
    state.pathLayer = null;
  }
  state.nestsLayer?.clearLayers();
}

export function drawRoute(route) {
  if (!state.map) return;
  clearRouteLayers();

  if (!route?.path?.length) return;

  state.pathLayer = L.polyline(route.path.map(p => [p.lat, p.lng]), {
    color: "#22c55e",
    weight: 4,
  }).addTo(state.map);

  state.map.fitBounds(state.pathLayer.getBounds().pad(0.2));

  (route.nests || []).forEach(n => {
    const marker = L.marker([n.lat, n.lng]).addTo(state.nestsLayer);
    const desc = (n.description || "Sem observações.").replaceAll("<","&lt;").replaceAll(">","&gt;");
    if (n.photoUrl) {
      marker.bindPopup(
        `<div style="font-size:12px"><strong>Ninho</strong><br><img src="${n.photoUrl}" style="max-width:140px;border-radius:8px;margin-top:6px"/><br>${desc}</div>`
      );
    } else {
      marker.bindPopup(`<div style="font-size:12px"><strong>Ninho</strong><br>${desc}</div>`);
    }
  });
}

function setGpsText(text) {
  const el = document.getElementById("info-gps");
  if (el) el.textContent = text;
}
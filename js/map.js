import { state } from "./state.js";
import { ui } from "./ui.js";

export function initMap() {
  state.map = L.map("map");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);

  state.nestsLayerGroup = L.layerGroup().addTo(state.map);

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        state.map.setView([latitude, longitude], 17);
        updateUserMarker(latitude, longitude);
        ui.infoGps.textContent = "GPS: sinal ok";
      },
      () => {
        state.map.setView([-15.601, -56.097], 13);
        ui.infoGps.textContent = "GPS: não autorizado";
      }
    );
  } else {
    state.map.setView([-15.601, -56.097], 13);
    ui.infoGps.textContent = "GPS: não disponível";
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

export function clearMapLayers() {
  if (!state.map) return;

  if (state.pathLayer) {
    state.map.removeLayer(state.pathLayer);
    state.pathLayer = null;
  }
  state.nestsLayerGroup?.clearLayers();
}

export function drawRouteOnMap(route) {
  if (!state.map) return;
  clearMapLayers();

  if (!route?.path?.length) return;

  state.pathLayer = L.polyline(
    route.path.map((p) => [p.lat, p.lng]),
    { color: "#22c55e", weight: 4 }
  ).addTo(state.map);

  const bounds = state.pathLayer.getBounds();
  state.map.fitBounds(bounds.pad(0.2));

  if (route.nests?.length) {
    route.nests.forEach((nest) => {
      const marker = L.marker([nest.lat, nest.lng]).addTo(state.nestsLayerGroup);

      if (nest.photoUrl) {
        marker.bindPopup(
          `<div style="font-size:12px">
            <strong>Ninho</strong><br>
            <img src="${nest.photoUrl}" style="max-width:120px;border-radius:6px;margin-top:6px;display:block"/>
            <div style="margin-top:6px">${nest.description || ""}</div>
          </div>`
        );
      } else {
        marker.bindPopup(
          `<div style="font-size:12px"><strong>Ninho</strong><br>${nest.description || "Sem observações."}</div>`
        );
      }
    });
  }
}

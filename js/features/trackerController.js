import { state } from "../state.js";
import { updateUserMarker } from "./mapController.js";
import { calcDistance } from "../services/routesService.js";

export function startRoute() {
  if (!navigator.geolocation) {
    alert("Seu dispositivo não suporta GPS.");
    return;
  }

  state.currentRoute = {
    id: null,
    name: "",
    created_at: new Date().toISOString(),
    path: [],
    nests: [],
    totalDistance: 0,
    synced: state.isOnline,
  };

  // layer
  if (state.pathLayer) {
    state.map.removeLayer(state.pathLayer);
    state.pathLayer = null;
  }
  state.nestsLayer?.clearLayers();

  state.pathLayer = L.polyline([], { color: "#22c55e", weight: 4 }).addTo(state.map);

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      const point = { lat: latitude, lng: longitude, t: new Date().toISOString() };
      state.currentRoute.path.push(point);

      updateUserMarker(latitude, longitude);
      state.pathLayer.addLatLng([latitude, longitude]);

      const d = calcDistance(state.currentRoute.path);
      state.currentRoute.totalDistance = d;

      const infoDistance = document.getElementById("info-distance");
      if (infoDistance) infoDistance.textContent = `Distância: ${d.toFixed(d>1000?1:0)} m`;

      state.map.panTo([latitude, longitude], { animate: true });
      const gps = document.getElementById("info-gps");
      if (gps) gps.textContent = "GPS: acompanhando…";
    },
    () => {
      const gps = document.getElementById("info-gps");
      if (gps) gps.textContent = "GPS: erro ao ler posição";
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

export function stopRoute() {
  if (state.watchId != null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  const route = state.currentRoute;
  state.currentRoute = null;

  return route;
}
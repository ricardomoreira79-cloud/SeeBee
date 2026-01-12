import { state, resetRouteState } from "./state.js";
import { setPosText, setDistanceText, setRouteHint } from "./ui.js";
import { CONFIG } from "./config.js";

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)));
}

export function initMap() {
  const el = document.getElementById("map");
  state.map = L.map(el, { zoomControl: true }).setView([-15.6142, -56.1749], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);

  state.polyline = L.polyline([], { weight: 5 }).addTo(state.map);

  setRouteHint("Toque em “Iniciar trajeto” para começar a gravar o caminho.");
}

export async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {});
    }
  } catch {
    // iOS Safari pode não suportar; seguimos sem.
  }
}

export async function releaseWakeLock() {
  try {
    if (state.wakeLock) await state.wakeLock.release();
  } catch {}
  state.wakeLock = null;
}

export function startWatch(onPoint) {
  if (!navigator.geolocation) {
    setRouteHint("Geolocalização não suportada neste dispositivo.");
    return;
  }

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const p = { lat, lng, t: new Date().toISOString() };

      setPosText(lat, lng);

      if (state.lastLatLng) {
        const d = haversineM(state.lastLatLng, p);
        // filtra saltos muito grandes (GPS maluco)
        if (d < 80) state.distanceM += d;
      }
      state.lastLatLng = p;
      setDistanceText(state.distanceM);

      // Atualiza polyline em tempo real
      state.routePoints.push(p);
      state.polyline.addLatLng([lat, lng]);
      state.map.panTo([lat, lng], { animate: true });

      onPoint?.(p);
    },
    (err) => {
      setRouteHint(`Erro de GPS: ${err.message}`);
    },
    CONFIG.GEO
  );
}

export function stopWatch() {
  if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
}

export function resetMapRoute() {
  resetRouteState();
  if (state.polyline) state.polyline.setLatLngs([]);
  setDistanceText(0);
  setPosText(null, null);
}

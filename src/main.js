import { supabase } from "./supabaseClient.js";
import { CONFIG } from "./config.js";
import { state, resetSessionState } from "./state.js";
import { ui, setNetBadge, showMsg, hideMsg, renderStats, renderNestList, clearNestForm } from "./ui.js";
import { initAuth } from "./auth.js";
import { initMap, setUserPosition, resetRouteLine, addRoutePoint, addNestMarker } from "./map.js";
import { createRoute, updateRoutePath } from "./routes.js";
import { insertNest, listNestsByRoute } from "./nests.js";

let watchId = null;
let lastLatLng = null;

function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function bindNetIndicator() {
  const refresh = () => setNetBadge(navigator.onLine);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  refresh();
}

async function bootstrap() {
  bindNetIndicator();
  initMap();

  // PWA / SW opcional
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  await initAuth();

  // pega usuário atual
  const { data } = await supabase.auth.getSession();
  state.user = data.session?.user || null;

  // manter state.user atualizado
  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;

    // reset forte de UI quando troca usuário (evita foto/lista de um usuário aparecer no outro)
    resetSessionState();
    clearNestForm();
    ui.nestList.innerHTML = "";
    renderStats();

    if (!state.user) {
      stopTracking();
    }
  });

  ui.photo.addEventListener("change", () => {
    const f = ui.photo.files?.[0];
    ui.photoName.textContent = f ? f.name : "";
  });

  ui.btnStartRoute.addEventListener("click", startRoute);
  ui.btnFinishRoute.addEventListener("click", finishRoute);
  ui.btnMarkNest.addEventListener("click", markNest);

  // esconder logout na tela inicial (auth)
  ui.btnLogout.style.display = "none";
}

async function startRoute() {
  hideMsg(ui.nestMsg);

  try {
    if (!state.user) throw new Error("Faça login para iniciar o trajeto.");

    resetSessionState();
    clearNestForm();
    ui.nestList.innerHTML = "";
    renderStats();

    state.route.id = await createRoute();
    state.route.active = true;

    ui.btnStartRoute.disabled = true;
    ui.btnFinishRoute.disabled = false;

    resetRouteLine();
    lastLatLng = null;
    stopTracking();
    startTracking();
  } catch (e) {
    showMsg(ui.nestMsg, e.message || String(e));
  }
}

async function finishRoute() {
  hideMsg(ui.nestMsg);

  try {
    if (!state.route.id) throw new Error("Nenhum trajeto ativo.");

    state.route.active = false;
    ui.btnStartRoute.disabled = false;
    ui.btnFinishRoute.disabled = true;

    stopTracking();
    await updateRoutePath(state.route.id, state.route.points);
  } catch (e) {
    showMsg(ui.nestMsg, e.message || String(e));
  }
}

function startTracking() {
  if (!("geolocation" in navigator)) {
    showMsg(ui.nestMsg, "Geolocalização não disponível neste dispositivo.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setUserPosition(lat, lng, { pan: false });

      if (!state.route.active) return;

      const now = { lat, lng, t: Date.now() };

      if (lastLatLng) {
        const d = metersBetween(lastLatLng, now);
        // ignora saltos absurdos
        if (d < 80) {
          state.route.distanceMeters += d;
          addRoutePoint(lat, lng);
          state.route.points.push(now);
        }
      } else {
        addRoutePoint(lat, lng);
        state.route.points.push(now);
      }

      lastLatLng = now;
      renderStats();
    },
    (err) => {
      showMsg(ui.nestMsg, `Erro GPS: ${err.message}`);
    },
    CONFIG.GEO
  );
}

function stopTracking() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

async function markNest() {
  hideMsg(ui.nestMsg);

  try {
    if (!state.user) throw new Error("Faça login para marcar ninhos.");
    if (!state.route.id || !state.route.active) {
      throw new Error("Inicie um trajeto antes de marcar o ninho.");
    }
    if (!lastLatLng) throw new Error("Aguardando GPS… caminhe um pouco para obter posição.");

    const file = ui.photo.files?.[0] || null;

    const created = await insertNest({
      routeId: state.route.id,
      lat: lastLatLng.lat,
      lng: lastLatLng.lng,
      status: ui.status.value,
      note: ui.note.value.trim(),
      file
    });

    // atualiza UI local
    addNestMarker(created.lat, created.lng, created.status);

    const list = await listNestsByRoute(state.route.id);
    state.nests.list = list;
    state.nests.count = list.length;

    renderNestList();
    renderStats();

    clearNestForm();
    showMsg(ui.nestMsg, "Ninho registrado com sucesso.");
  } catch (e) {
    showMsg(ui.nestMsg, e.message || String(e));
  }
}

bootstrap();

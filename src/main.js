import { createSupabaseClient } from "./supabaseClient.js";
import { State } from "./state.js";
import { $, showMsg, hideMsg, renderThumbs } from "./ui.js";
import { initAuth } from "./auth.js";
import { initMap, setRoutePolyline, addNestMarker, panTo } from "./map.js";
import { createRouteIfNeeded, appendPointToRoute } from "./routes.js";
import { createNest } from "./nests.js";
import { CONFIG } from "./config.js";

async function boot(){
  State.supabase = await createSupabaseClient();

  initMap();
  await initAuth();

  wireRouteButtons();
  wireNestButton();
}

function wireRouteButtons(){
  $("btnStartRoute").addEventListener("click", async () => {
    const msg = $("routeMsg");
    hideMsg(msg);

    try{
      if (!State.user) throw new Error("Faça login para iniciar o trajeto.");

      const id = await createRouteIfNeeded();
      State.totalDistanceM = 0;
      State.lastPos = null;
      $("distValue").textContent = "0 m";
      $("posValue").textContent = "—";

      $("btnStartRoute").disabled = true;
      $("btnStopRoute").disabled = false;

      startWatchPosition(id);

      showMsg(msg, "Trajeto iniciado. Caminhe e o mapa vai desenhar a linha em tempo real.");
    }catch(err){
      showMsg(msg, `Erro ao iniciar trajeto: ${err.message}`, true);
    }
  });

  $("btnStopRoute").addEventListener("click", async () => {
    const msg = $("routeMsg");
    hideMsg(msg);

    try{
      stopWatchPosition();
      $("btnStartRoute").disabled = false;
      $("btnStopRoute").disabled = true;
      showMsg(msg, "Trajeto finalizado.");
    }catch(err){
      showMsg(msg, `Erro ao finalizar: ${err.message}`, true);
    }
  });
}

function startWatchPosition(routeId){
  stopWatchPosition();

  const latlngs = [];

  State.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;

    $("posValue").textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // distância acumulada
    if (State.lastPos){
      State.totalDistanceM += haversineM(State.lastPos.lat, State.lastPos.lng, lat, lng);
      $("distValue").textContent = formatDistance(State.totalDistanceM);
    }

    State.lastPos = { lat, lng };

    // desenhar linha
    latlngs.push([lat, lng]);
    setRoutePolyline(latlngs);
    panTo(lat, lng);

    // gravar no banco (em tempo real)
    const point = { t: new Date().toISOString(), lat, lng, acc };
    await appendPointToRoute(routeId, point);

  }, (err) => {
    const msg = $("routeMsg");
    showMsg(msg, `Geolocalização falhou: ${err.message}`, true);
  }, CONFIG.GEO);
}

function stopWatchPosition(){
  if (State.watchId != null){
    navigator.geolocation.clearWatch(State.watchId);
    State.watchId = null;
  }
}

function wireNestButton(){
  $("btnSaveNest").addEventListener("click", async () => {
    const msg = $("nestMsg");
    hideMsg(msg);

    try{
      if (!State.user) throw new Error("Faça login para marcar um ninho.");
      if (!State.activeRouteId) throw new Error("Inicie um trajeto antes de marcar um ninho.");
      if (!State.lastPos) throw new Error("Aguardando posição GPS... caminhe um pouco e tente novamente.");

      const note = $("nestNote").value.trim();
      const status = $("nestStatus").value;
      const file = $("nestPhoto").files?.[0] || null;

      const saved = await createNest({
        routeId: State.activeRouteId,
        note,
        status,
        lat: State.lastPos.lat,
        lng: State.lastPos.lng,
        photoFile: file
      });

      addNestMarker(saved.lat, saved.lng, saved.status);
      State.marked.unshift(saved);
      renderThumbs(State.marked);

      $("nestNote").value = "";
      $("nestPhoto").value = "";

      showMsg(msg, "Ninho salvo com sucesso.");
    }catch(err){
      showMsg(msg, err.message || String(err), true);
    }
  });
}

function formatDistance(m){
  if (m < 1000) return `${Math.round(m)} m`;
  const km = (m/1000);
  return `${km.toFixed(2)} km`;
}

function haversineM(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

boot();

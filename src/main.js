import { initAuth, bindAuthUI } from "./auth.js";
import { initMap, startWatch, stopWatch, resetMapRoute, requestWakeLock, releaseWakeLock } from "./map.js";
import { createRoute, finishRoute } from "./routes.js";
import { createNest, listNestsByRoute } from "./nests.js";
import { state } from "./state.js";
import { $, setMsg, enableRouteButtons, setRouteHint } from "./ui.js";

async function refreshThumbs() {
  const box = $("thumbs");
  box.innerHTML = "";

  if (!state.routeId) return;

  const items = await listNestsByRoute(state.routeId);
  if (!items.length) {
    box.innerHTML = `<div class="muted">Nenhum ninho marcado ainda.</div>`;
    return;
  }

  for (const it of items) {
    const div = document.createElement("div");
    div.className = "thumb";
    div.innerHTML = `
      ${it.photo_url ? `<img src="${it.photo_url}" alt="Foto do ninho" />` : `<div style="height:120px;display:grid;place-items:center;color:rgba(255,255,255,.45)">Sem foto</div>`}
      <div class="meta">
        <span>${(it.status || "").toUpperCase()}</span>
        <span>${new Date(it.created_at).toLocaleString("pt-BR")}</span>
      </div>
    `;
    box.appendChild(div);
  }
}

async function onStartRoute() {
  try {
    setMsg($("nestMsg"), "");
    setRouteHint("Iniciando trajeto...");

    resetMapRoute();

    const name = `Trajeto ${new Date().toLocaleString("pt-BR")}`;
    const routeId = await createRoute(name);
    state.routeId = routeId;

    enableRouteButtons(true);
    await requestWakeLock();

    // grava pontos em memória (state.routePoints)
    startWatch(() => {
      // nada aqui por enquanto (a polyline já atualiza no map.js)
    });

    setRouteHint("Trajeto em andamento. Marque ninhos durante a caminhada.");
    await refreshThumbs();
  } catch (e) {
    setRouteHint("");
    setMsg($("nestMsg"), e.message || String(e), "error");
  }
}

async function onFinishRoute() {
  try {
    setRouteHint("Finalizando trajeto...");
    stopWatch();
    await releaseWakeLock();

    if (state.routeId) {
      await finishRoute(state.routeId, state.routePoints);
    }

    enableRouteButtons(false);
    setRouteHint("Trajeto finalizado.");
    await refreshThumbs();
  } catch (e) {
    setMsg($("nestMsg"), e.message || String(e), "error");
  }
}

async function onMarkNest() {
  try {
    setMsg($("nestMsg"), "Salvando ninho...");

    if (!state.routeId) throw new Error("Inicie um trajeto primeiro.");

    const obs = $("nestObs").value.trim();
    const status = $("nestStatus").value;
    const file = $("nestPhoto").files?.[0] || null;

    const last = state.lastLatLng;
    if (!last) throw new Error("Ainda sem posição GPS. Aguarde o GPS atualizar.");

    await createNest({
      routeId: state.routeId,
      obs,
      status,
      lat: last.lat,
      lng: last.lng,
      file
    });

    $("nestObs").value = "";
    $("nestPhoto").value = "";

    setMsg($("nestMsg"), "Ninho salvo com sucesso ✅", "ok");
    await refreshThumbs();
  } catch (e) {
    setMsg($("nestMsg"), e.message || String(e), "error");
  }
}

function bindAppUI() {
  $("btnStartRoute").addEventListener("click", onStartRoute);
  $("btnFinishRoute").addEventListener("click", onFinishRoute);
  $("btnMarkNest").addEventListener("click", onMarkNest);

  enableRouteButtons(false);
}

async function registerSW() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch {
      // sem stress
    }
  }
}

(async function boot() {
  initMap();
  bindAuthUI();
  bindAppUI();

  await initAuth();
  await registerSW();
})();

import { supabase } from "./supabaseClient.js";
import { ui, openDrawer, closeDrawer, toast, toastQuick, showPage, setNetStatus, renderList } from "./ui.js";
import { state, resetSessionState } from "./state.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, setUserMarker, addRoutePoint, addNestMarker, resetMapOverlays, fitToUser } from "./map.js";
import { createRoute, finishRoute, listMyRoutes } from "./routes.js";
import { addNest, listNestsByRoute, listAllMyNests } from "./nests.js";

function fmtMeters(m) {
  if (!m || m < 0) return "0 m";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(q));
}

async function refreshHomeLists() {
  // lista rápida desta trilha
  renderList(
    ui.nestList,
    state.currentNests,
    (n) => `
      <div class="item_title">${n.status || "CATALOGADO"} • ${n.species || "Espécie não informada"}</div>
      <div class="item_meta">${n.note || n.obs || "Sem observação"} • ${new Date(n.created_at || n.cataloged_at || Date.now()).toLocaleString("pt-BR")}</div>
    `
  );
  ui.routeNestCount.textContent = String(state.currentNests.length || 0);
}

async function onLoggedIn() {
  // mapa
  initMap("map");

  // UI de rede
  setNetStatus(navigator.onLine);
  window.addEventListener("online", () => setNetStatus(true));
  window.addEventListener("offline", () => setNetStatus(false));

  // carregar listas secundárias “vazias” (mensagem)
  await loadTrailsPage();
  await loadNestsPage();

  // reset para não “vazar” overlays/arquivo entre usuários
  resetSessionState();
  resetMapOverlays();
  try { ui.nestPhoto.value = ""; } catch {}

  showPage("home");
}

async function loadTrailsPage() {
  if (!state.user) return;
  const trails = await listMyRoutes(supabase, state.user.id);
  renderList(
    ui.trailsList,
    trails,
    (t) => `
      <div class="item_title">${t.name || "Trilha"}</div>
      <div class="item_meta">${t.status || "-"} • ${t.started_at ? new Date(t.started_at).toLocaleString("pt-BR") : ""}</div>
    `,
    ui.trailsEmpty
  );
}

async function loadNestsPage() {
  if (!state.user) return;
  const nests = await listAllMyNests(supabase, state.user.id);
  renderList(
    ui.allNestsList,
    nests,
    (n) => `
      <div class="item_title">${n.status || "CATALOGADO"} • ${n.species || "Espécie não informada"}</div>
      <div class="item_meta">${(n.note || n.obs || "Sem observação")} • ${new Date(n.created_at || n.cataloged_at || Date.now()).toLocaleString("pt-BR")}</div>
      ${n.photo_url ? `<div class="item_meta"><a href="${n.photo_url}" target="_blank" rel="noreferrer">Ver foto</a></div>` : ""}
    `,
    ui.nestsEmpty
  );
}

function bindDrawer() {
  ui.btnMenu.addEventListener("click", openDrawer);
  ui.btnCloseDrawer.addEventListener("click", closeDrawer);
  ui.drawer.addEventListener("click", (e) => {
    const btn = e.target.closest(".drawer_item");
    if (!btn) return;
    const r = btn.getAttribute("data-route");
    if (!r) return;

    showPage(r === "home" ? "home" : r);
    closeDrawer();

    if (r === "trails") loadTrailsPage();
    if (r === "nests") loadNestsPage();
  });
}

function bindProfile() {
  ui.btnSaveProfile.addEventListener("click", async () => {
    // nesta fase: salvar em profiles (se existir) é opcional.
    // aqui só registramos a intenção e mantemos pronto para próxima etapa.
    toast(ui.profileMsg, "Salvo (estrutura pronta para evoluir com profiles).", "ok");
    toastQuick("Perfil salvo.");
  });
}

function bindRouteFlow() {
  ui.btnStartRoute.addEventListener("click", async () => {
    if (!state.user) return;

    toast(ui.routeMsg, "", "ok");

    try {
      // pega um “fix” rápido e centraliza (mapa mais aproximado)
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000 });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setUserMarker(lat, lng);
      fitToUser(lat, lng);

      // cria trilha no banco
      state.route = await createRoute(supabase, state.user.id);
      state.routePath = [];
      state.routeDistanceM = 0;
      state.currentNests = [];

      resetMapOverlays();
      addRoutePoint(lat, lng);
      state.routePath.push({ lat, lng, ts: new Date().toISOString() });
      state.lastPos = { lat, lng };

      ui.routeDistance.textContent = fmtMeters(0);
      ui.routeNestCount.textContent = "0";
      ui.btnStartRoute.disabled = true;
      ui.btnFinishRoute.disabled = false;

      toast(ui.routeMsg, "Trilha iniciada. Caminhe e o mapa vai desenhar a linha em tempo real.", "ok");

      // watchPosition = gravação real contínua
      state.geoWatchId = navigator.geolocation.watchPosition(
        (p) => {
          const lat2 = p.coords.latitude;
          const lng2 = p.coords.longitude;

          setUserMarker(lat2, lng2);
          addRoutePoint(lat2, lng2);

          const now = { lat: lat2, lng: lng2, ts: new Date().toISOString() };
          state.routePath.push(now);

          if (state.lastPos) {
            state.routeDistanceM += haversine(state.lastPos, now);
            ui.routeDistance.textContent = fmtMeters(state.routeDistanceM);
          }
          state.lastPos = now;
        },
        (err) => {
          toast(ui.routeMsg, `Erro GPS: ${err.message || err}`, "error");
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
    } catch (e) {
      toast(ui.routeMsg, `AbortError: The operation was aborted.` , "error");
    }
  });

  ui.btnFinishRoute.addEventListener("click", async () => {
    if (!state.user || !state.route?.id) return;

    try {
      if (state.geoWatchId != null) {
        try { navigator.geolocation.clearWatch(state.geoWatchId); } catch {}
        state.geoWatchId = null;
      }

      await finishRoute(supabase, state.route.id, state.routePath, []);
      toast(ui.routeMsg, "Trilha finalizada e salva.", "ok");

      ui.btnStartRoute.disabled = false;
      ui.btnFinishRoute.disabled = true;

      await loadTrailsPage();
    } catch (e) {
      toast(ui.routeMsg, e.message || String(e), "error");
    }
  });
}

function bindNestFlow() {
  ui.btnAddNest.addEventListener("click", async () => {
    if (!state.user) return toast(ui.nestMsg, "Faça login para marcar ninho.", "error");
    if (!state.route?.id) return toast(ui.nestMsg, "Inicie uma trilha antes de marcar ninhos.", "error");

    toast(ui.nestMsg, "", "ok");

    try {
      // usa a última posição registrada (mais confiável durante a trilha)
      const base = state.lastPos;
      if (!base) return toast(ui.nestMsg, "Sem posição GPS ainda. Aguarde o mapa atualizar.", "error");

      // marcador no mapa
      addNestMarker(base.lat, base.lng);

      const form = {
        note: ui.nestNote.value.trim(),
        status: ui.nestStatus.value,
        species: ui.nestSpecies.value.trim(),
        photoFile: ui.nestPhoto.files?.[0] || null,
      };

      const row = await addNest(supabase, state.user.id, state.route.id, base.lat, base.lng, form);

      // limpar foto para não “vazar” entre usos/usuários
      try { ui.nestPhoto.value = ""; } catch {}

      state.currentNests.unshift(row);
      await refreshHomeLists();
      toast(ui.nestMsg, "Ninho marcado com sucesso.", "ok");
      toastQuick("Ninho catalogado.");
    } catch (e) {
      toast(ui.nestMsg, e.message || String(e), "error");
    }
  });
}

function bindNetIndicator() {
  // somente após logado (já está no app)
  setNetStatus(navigator.onLine);
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

(async function boot() {
  registerSW();
  bindDrawer();
  bindProfile();
  bindRouteFlow();
  bindNestFlow();
  bindNetIndicator();

  bindAuth(supabase, onLoggedIn);

  // se já existir sessão, entra direto
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    state.user = data.session.user;
    await onLoggedIn();
  }
})();

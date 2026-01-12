import { getSupabase } from "./supabaseClient.js";
import { state, resetSessionState } from "./state.js";
import { ui, toast, showScreen, openDrawer, closeDrawer, setOnlineUI, clearNestForm } from "./ui.js";
import { CONFIG } from "./config.js";

import { initMap, setMapCenter, addRoutePoint, addNestMarker } from "./map.js";
import { bindAuth } from "./auth.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * (Math.sin(dLng / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

function formatDist(m) {
  if (!m) return "0 m";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function setRouteUI(isActive) {
  ui.btnStartRoute.disabled = isActive;
  ui.btnFinishRoute.disabled = !isActive;
}

async function refreshLists() {
  const trails = await loadMyTrails(supabase);
  ui.trailsList.innerHTML = "";
  ui.trailsEmpty.classList.toggle("hidden", trails.length !== 0);
  trails.forEach(t => {
    const div = document.createElement("div");
    div.className = "listItem";
    div.innerHTML = `
      <div style="font-weight:900">${t.name}</div>
      <div class="muted small">${new Date(t.created_at).toLocaleString("pt-BR")}</div>
      <div class="muted small">Pontos: ${(t.path?.length || 0)}</div>
    `;
    ui.trailsList.appendChild(div);
  });

  const nests = await loadMyNests(supabase);
  ui.allNestsList.innerHTML = "";
  ui.nestsEmpty.classList.toggle("hidden", nests.length !== 0);
  nests.forEach(n => {
    const div = document.createElement("div");
    div.className = "listItem";
    const cat = n.cataloged_at ? new Date(n.cataloged_at).toLocaleDateString("pt-BR") : "—";
    const cap = n.captured_at ? new Date(n.captured_at).toLocaleDateString("pt-BR") : null;
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px">
        <div style="font-weight:900">${n.status}</div>
        <div class="badge">${cap ? `Capturado em ${cap}` : `Catalogado em ${cat}`}</div>
      </div>
      <div class="muted small">${n.note || ""}</div>
      ${n.photo_url ? `<div class="muted small">📷 Foto salva</div>` : `<div class="muted small">Sem foto</div>`}
    `;
    ui.allNestsList.appendChild(div);
  });
}

function bindDrawerNav() {
  document.querySelectorAll(".drawerItem").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nav = btn.getAttribute("data-nav");
      showScreen(nav);

      // mensagens rápidas (3s) quando vazio
      if (nav === "trails") {
        await refreshLists();
        if (state.allTrails.length === 0) toast(ui.trailsEmpty, "Nenhuma trilha salva.", "ok");
      }
      if (nav === "nests") {
        await refreshLists();
        if (state.allNests.length === 0) toast(ui.nestsEmpty, "Nenhum ninho catalogado.", "ok");
      }
    });
  });
}

function watchOnline() {
  const update = () => {
    state.online = navigator.onLine;
    setOnlineUI(state.online);
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function startWatchingGPS() {
  if (!navigator.geolocation) throw new Error("Geolocalização não suportada.");

  // mantemos o watchPosition rodando durante a trilha (tela apagada reduz, mas volta)
  // para manter mais, no iOS o limite é do navegador – mas aqui é o melhor padrão.
  state.watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const ts = new Date().toISOString();

      const point = { lat, lng, ts };
      state.lastPos = point;

      // mapa segue e desenha
      addRoutePoint(lat, lng);

      // distância
      if (state.routePoints.length > 0) {
        const prev = state.routePoints[state.routePoints.length - 1];
        const d = metersBetween(prev, point);
        state._dist = (state._dist || 0) + d;
        ui.distanceText.textContent = formatDist(state._dist);
      } else {
        ui.distanceText.textContent = "0 m";
      }

      // guarda pontos e atualiza no banco de 5 em 5
      await appendRoutePoint(supabase, point);

      // zoom/foco inicial forte na sua região (apenas no início)
      if (state.routePoints.length === 1) {
        setMapCenter(lat, lng, CONFIG.MAP.followZoom);
      }
    },
    (err) => {
      toast(ui.routeHint, `GPS: ${err.message}`, "error");
    },
    CONFIG.GEO
  );
}

function stopWatchingGPS() {
  if (state.watchId != null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

async function onLoggedIn() {
  initMap();
  watchOnline();
  bindDrawerNav();
  showScreen("home");

  // limpa estado e formulário ao trocar usuário
  resetSessionState();
  clearNestForm();

  // preencher email no perfil (campo desabilitado)
  ui.p_email.value = state.user?.email || "";

  // tentar centralizar mapa já na posição atual
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => setMapCenter(pos.coords.latitude, pos.coords.longitude, CONFIG.MAP.followZoom),
      () => {}
    );
  }

  await refreshLists();
}

ui.btnMenu.addEventListener("click", openDrawer);
ui.btnCloseDrawer.addEventListener("click", closeDrawer);
ui.backdrop.addEventListener("click", closeDrawer);

ui.nestPhoto.addEventListener("change", (e) => {
  state.selectedFile = e.target.files?.[0] || null;
});

ui.btnStartRoute.addEventListener("click", async () => {
  try {
    initMap();
    state._dist = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0";
    ui.routeHint.classList.add("hidden");

    // cria trilha no banco (NUNCA com path null)
    const route = await createRoute(supabase);
    toast(ui.routeHint, `Trilha iniciada: ${route.name}`, "ok");
    ui.routeHint.classList.remove("hidden");
    setRouteUI(true);

    startWatchingGPS();
  } catch (e) {
    toast(ui.routeHint, e.message || String(e), "error");
    ui.routeHint.classList.remove("hidden");
  }
});

ui.btnFinishRoute.addEventListener("click", async () => {
  try {
    stopWatchingGPS();
    await finishRoute(supabase);
    setRouteUI(false);
    toast(ui.routeHint, "Trilha finalizada e salva.", "ok");
    ui.routeHint.classList.remove("hidden");
    await refreshLists();
  } catch (e) {
    toast(ui.routeHint, e.message || String(e), "error");
    ui.routeHint.classList.remove("hidden");
  }
});

ui.btnMarkNest.addEventListener("click", async () => {
  try {
    if (!state.currentRoute) {
      return toast(ui.nestMsg, "Inicie uma trilha antes de marcar um ninho.", "error");
    }
    if (!state.lastPos) {
      return toast(ui.nestMsg, "Aguardando GPS… caminhe alguns segundos.", "error");
    }

    const note = ui.nestNote.value.trim();
    const status = ui.nestStatus.value;
    const species = ui.nestSpecies.value.trim() || null;

    const created = await createNest(supabase, {
      note,
      status,
      species,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute.id,
      photoFile: state.selectedFile
    });

    // marcador no mapa no ponto do ninho
    addNestMarker(created.lat, created.lng);

    // lista rápida
    renderNestList();
    ui.nestsCountText.textContent = String(state.nestsThisRoute.length);

    toast(ui.nestMsg, "Ninho registrado com sucesso.", "ok");
    clearNestForm(); // evita “foto vazando” para outro usuário
  } catch (e) {
    toast(ui.nestMsg, e.message || String(e), "error");
  }
});

function renderNestList() {
  ui.nestList.innerHTML = "";
  state.nestsThisRoute.forEach(n => {
    const item = document.createElement("div");
    item.className = "nestItem";
    const cat = n.cataloged_at ? new Date(n.cataloged_at).toLocaleDateString("pt-BR") : "—";
    const cap = n.captured_at ? new Date(n.captured_at).toLocaleDateString("pt-BR") : null;
    item.innerHTML = `
      <div>
        <div style="font-weight:900">${n.status}</div>
        <div class="muted small">${n.note || ""}</div>
        <div class="muted small">${cap ? `Capturado em ${cap}` : `Catalogado em ${cat}`}</div>
      </div>
      <div class="badge">${n.photo_url ? "📷 Foto" : "Sem foto"}</div>
    `;
    ui.nestList.appendChild(item);
  });
}

bindAuth(supabase, onLoggedIn);

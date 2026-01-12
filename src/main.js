import { supabase } from "./supabaseClient.js";
import { CONFIG } from "./config.js";
import { state, resetSessionState } from "./state.js";
import {
  ui, setNetBadge, showMsg, hideMsg, renderStats, renderNestList, clearNestForm,
  openDrawer, closeDrawer, showView, setActiveNav
} from "./ui.js";
import { initAuth } from "./auth.js";
import { initMaps, setUserPosition, resetRouteLineHome, addRoutePointHome, addNestMarkerHome, renderRouteOnMap2 } from "./map.js";
import { createRoute, updateRoutePath, listMyRoutes } from "./routes.js";
import { insertNest, listNestsByRoute, updateNestCaptured } from "./nests.js";
import { loadProfile, saveProfileUserType } from "./profile.js";

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

function startTracking() {
  if (!("geolocation" in navigator)) {
    showMsg(ui.nestMsg, "Geolocalização não disponível neste dispositivo.");
    return;
  }

  stopTracking(); // garante que não fica duplicado

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setUserPosition(lat, lng);

      const now = { lat, lng, t: Date.now() };

      // sempre guarda o "último ponto" internamente
      // mas não exibimos mais na UI
      if (state.route.active) {
        // desenha e calcula distância
        if (lastLatLng) {
          const d = metersBetween(lastLatLng, now);
          if (d < 80) { // corta saltos absurdos
            state.route.distanceMeters += d;
            addRoutePointHome(lat, lng);
            state.route.points.push(now);
          }
        } else {
          addRoutePointHome(lat, lng);
          state.route.points.push(now);
        }

        renderStats();
      }

      lastLatLng = now;
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

async function startRoute() {
  hideMsg(ui.nestMsg);

  try {
    if (!state.user) throw new Error("Faça login para iniciar o trajeto.");

    // reseta estado do trajeto atual
    state.route.active = false;
    state.route.id = null;
    state.route.points = [];
    state.route.distanceMeters = 0;

    state.nests.list = [];
    state.nests.count = 0;

    clearNestForm();
    ui.nestList.innerHTML = "";
    renderStats();

    resetRouteLineHome();
    lastLatLng = null;

    // cria rota no banco
    const created = await createRoute();
    state.route.id = created.id;

    // inicia gravação
    state.route.active = true;

    ui.btnStartRoute.disabled = true;
    ui.btnFinishRoute.disabled = false;

    startTracking();
    showMsg(ui.nestMsg, "Trajeto iniciado. Caminhe para desenhar a rota no mapa.");
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

    // salva path completo
    await updateRoutePath(state.route.id, state.route.points);

    showMsg(ui.nestMsg, "Trajeto finalizado e salvo.");
  } catch (e) {
    showMsg(ui.nestMsg, e.message || String(e));
  }
}

async function markNest() {
  hideMsg(ui.nestMsg);

  try {
    if (!state.user) throw new Error("Faça login para marcar ninhos.");
    if (!state.route.id || !state.route.active) throw new Error("Inicie um trajeto antes de marcar o ninho.");
    if (!lastLatLng) throw new Error("Aguardando GPS… caminhe um pouco para obter posição.");

    const file = ui.photo.files?.[0] || null;

    const created = await insertNest({
      routeId: state.route.id,
      lat: lastLatLng.lat,
      lng: lastLatLng.lng,
      status: ui.status.value,
      note: ui.note.value.trim(),
      species: ui.species.value.trim(),
      file
    });

    // pino no mapa (IMEDIATO)
    addNestMarkerHome(created.lat, created.lng, created.status);

    // atualiza lista local
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

function bindDrawerAndNav() {
  ui.btnMenu.addEventListener("click", openDrawer);
  ui.btnCloseMenu.addEventListener("click", closeDrawer);
  ui.drawerBackdrop.addEventListener("click", closeDrawer);

  ui.navHome.addEventListener("click", () => {
    setActiveNav("home");
    showView("home");
    closeDrawer();
  });

  ui.navInstalacoes.addEventListener("click", async () => {
    setActiveNav("inst");
    showView("inst");
    closeDrawer();
    await refreshRoutes();
  });

  ui.navProfile.addEventListener("click", async () => {
    setActiveNav("profile");
    showView("profile");
    closeDrawer();
    await refreshProfile();
  });
}

async function refreshProfile() {
  hideMsg(ui.profileMsg);

  try {
    if (!state.user) return;

    ui.profileEmail.value = state.user.email || "";
    const p = await loadProfile();
    ui.userType.value = p?.user_type || "";
  } catch {
    // se não tiver tabela profiles, não quebra
  }
}

async function saveProfile() {
  hideMsg(ui.profileMsg);

  try {
    await saveProfileUserType(ui.userType.value);
    showMsg(ui.profileMsg, "Dados salvos.");
  } catch (e) {
    // se não existir a tabela, avisamos claramente
    showMsg(ui.profileMsg, "Não foi possível salvar. Verifique se existe a tabela 'profiles' com coluna 'user_type'.");
  }
}

async function refreshRoutes() {
  hideMsg(ui.routesMsg);
  ui.routesList.innerHTML = "";
  ui.routeNestsList.innerHTML = "";
  ui.routeDetailTitle.textContent = "";

  try {
    const routes = await listMyRoutes();

    if (!routes.length) {
      showMsg(ui.routesMsg, "Você ainda não tem trajetos gravados.");
      return;
    }

    for (const r of routes) {
      const created = r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "";

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="item__top">
          <div>
            <div class="item__title">${r.name || "Trajeto"}</div>
            <div class="item__sub">Criado em: ${created}</div>
          </div>
        </div>
        <div class="item__actions">
          <button class="btn btn--secondary" data-open="${r.id}">Abrir</button>
        </div>
      `;
      ui.routesList.appendChild(div);
    }

    ui.routesList.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const routeId = btn.getAttribute("data-open");
        const route = routes.find(x => x.id === routeId);
        await openRouteDetails(route);
      });
    });
  } catch (e) {
    showMsg(ui.routesMsg, e.message || String(e));
  }
}

async function openRouteDetails(route) {
  hideMsg(ui.routeNestsMsg);
  ui.routeNestsList.innerHTML = "";

  try {
    const nests = await listNestsByRoute(route.id);

    // desenha rota + pinos no mapa2
    const pts = Array.isArray(route.path) ? route.path : [];
    renderRouteOnMap2({ routePoints: pts, nests });

    ui.routeDetailTitle.textContent = `Trajeto: ${route.name || route.id}`;

    if (!nests.length) {
      showMsg(ui.routeNestsMsg, "Nenhum ninho registrado neste trajeto.");
      return;
    }

    for (const n of nests) {
      const catalogado = n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : "";
      const capturado = n.captured_at ? new Date(n.captured_at).toLocaleDateString("pt-BR") : "";

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <div class="item__top">
          <div>
            <div class="item__title">${n.status || "CATALOGADO"}</div>
            <div class="item__sub">
              ${n.status === "CAPTURADO"
                ? `Catalogado em ${catalogado} • Capturado em ${capturado}`
                : `Catalogado em ${catalogado}`}
            </div>
            <div class="item__sub">${(n.note || "").slice(0, 120)}</div>
            <div class="item__sub">${n.species ? `Espécie: ${n.species}` : ""}</div>
          </div>
        </div>

        <div class="item__actions">
          ${n.status !== "CAPTURADO" ? `<button class="btn btn--primary" data-capture="${n.id}">Marcar como CAPTURADO</button>` : ""}
        </div>
      `;

      ui.routeNestsList.appendChild(div);

      // opcional: mostrar miniatura
      if (n.photo_url) {
        const img = document.createElement("img");
        img.src = n.photo_url;
        img.style.width = "100%";
        img.style.borderRadius = "14px";
        img.style.marginTop = "10px";
        img.style.border = "1px solid rgba(255,255,255,.10)";
        div.appendChild(img);
      }
    }

    ui.routeNestsList.querySelectorAll("[data-capture]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nestId = btn.getAttribute("data-capture");

        try {
          const updated = await updateNestCaptured(nestId, { status: "CAPTURADO" });
          showMsg(ui.routeNestsMsg, "Atualizado para CAPTURADO.");
          // recarrega detalhes do trajeto (para refletir datas/status)
          await openRouteDetails(route);
        } catch (e) {
          showMsg(ui.routeNestsMsg, e.message || String(e));
        }
      });
    });
  } catch (e) {
    showMsg(ui.routeNestsMsg, e.message || String(e));
  }
}

async function bootstrap() {
  bindNetIndicator();
  initMaps();

  await initAuth();
  bindDrawerAndNav();

  // ações do home
  ui.photo.addEventListener("change", () => {
    const f = ui.photo.files?.[0];
    ui.photoName.textContent = f ? f.name : "";
  });

  ui.btnStartRoute.addEventListener("click", startRoute);
  ui.btnFinishRoute.addEventListener("click", finishRoute);
  ui.btnMarkNest.addEventListener("click", markNest);

  // perfil
  ui.btnSaveProfile.addEventListener("click", saveProfile);

  // carregar user
  const { data } = await supabase.auth.getSession();
  state.user = data.session?.user || null;

  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;

    resetSessionState();
    clearNestForm();
    ui.nestList.innerHTML = "";
    renderStats();

    if (!state.user) {
      stopTracking();
    } else {
      // logado: já prepara o perfil (se existir)
      refreshProfile();
    }
  });

  renderStats();
}

bootstrap();

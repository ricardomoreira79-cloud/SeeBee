// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function setupListeners() {
  // Menu Lateral
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");

  // Cliques no Menu Lateral
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        // Se for trilhas, carrega o mapa
        if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 100);
      }
    });
  });

  // Cliques na Bottom Nav
  ui.navItems.forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.dataset.target);
      if(item.dataset.target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 100);
    });
  });

  // Cliques no Dashboard (Home)
  ui.dashCards.forEach(card => {
    card.addEventListener("click", () => {
      if(card.classList.contains("disabled")) return;
      const target = card.dataset.target;
      if(target) {
        switchTab(target);
        if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 100);
      }
    });
  });

  // LOGOUT (O que você pediu!)
  if(ui.btnLogout) {
    ui.btnLogout.addEventListener("click", async () => {
      if(confirm("Tem certeza que deseja sair?")) {
        await supabase.auth.signOut();
        window.location.reload();
      }
    });
  }
}

// --- GPS E TRILHA ---
ui.btnStartRoute.onclick = async () => {
  try {
    await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    clearMapLayers();
    
    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
      state.lastPos = p;
      if (state.routePoints.length === 0) {
        addMarker(p.lat, p.lng, "#22c55e", "Início");
        setMapCenter(p.lat, p.lng, 18);
      }
      state.routePoints.push(p);
      addRoutePoint(p.lat, p.lng);
      if (state.currentRoute) await appendRoutePoint(supabase, p);
    }, null, { enableHighAccuracy: true });
  } catch (e) { alert(e.message); }
};

ui.btnFinishRoute.onclick = async () => {
  const name = prompt("Nome da Trilha:", `Trilha ${new Date().toLocaleDateString()}`);
  navigator.geolocation.clearWatch(state.watchId);
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");
  await finishRoute(supabase, name);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
};

ui.btnMarkNest.onclick = () => ui.modalNest.style.display = "flex";

ui.btnConfirmNest.onclick = async () => {
  ui.btnConfirmNest.disabled = true;
  try {
    await createNest(supabase, {
      note: ui.nestNote.value,
      lat: state.lastPos?.lat || 0,
      lng: state.lastPos?.lng || 0,
      route_id: state.currentRoute?.id,
      photoFile: ui.nestPhoto.files[0]
    });
    addMarker(state.lastPos?.lat, state.lastPos?.lng, "#fbbf24", "Isca");
    closeNestModal();
    toast(ui.routeHint, "Isca registrada!");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
};

// --- BOOT ---
bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  setOnlineUI(navigator.onLine);
  
  // AQUI: Redireciona para a HOME ao logar
  switchTab("view-home");
});
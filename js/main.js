// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMap } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function setupListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");

  document.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if(target === "view-captures") renderMaturation();
      }
    };
  });

  ui.btnLogoutAction.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
}

ui.btnStartRoute.onclick = async () => {
  try {
    await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    clearMap();
    state.nestsInRoute = 0;

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
  const name = prompt("Salvar trilha como:", `Trilha ${new Date().toLocaleDateString()}`);
  navigator.geolocation.clearWatch(state.watchId);
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");
  await finishRoute(supabase, name);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
};

ui.btnConfirmNest.onclick = async () => {
  ui.btnConfirmNest.disabled = true;
  try {
    await createNest(supabase, {
      note: ui.nestNote.value,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute.id,
      photoFile: ui.nestPhoto.files[0]
    });
    state.nestsInRoute++;
    ui.nestsCountText.textContent = `${state.nestsInRoute} ninhos marcados`;
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24", `Isca ${state.nestsInRoute}`);
    closeNestModal();
    toast(ui.routeHint, "Isca salva!", "ok");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
};

bindAuth(supabase, async () => {
  setupListeners();
  initMap();
});
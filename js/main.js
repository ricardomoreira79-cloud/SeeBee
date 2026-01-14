// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function setupMenu() {
  const openBtn = document.getElementById("open-menu");
  const closeBtn = document.getElementById("close-menu");
  const sideMenu = document.getElementById("side-menu");

  if(openBtn) openBtn.onclick = () => sideMenu.classList.add("open");
  if(closeBtn) closeBtn.onclick = () => sideMenu.classList.remove("open");

  document.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        sideMenu.classList.remove("open");
      }
    };
  });
}

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

bindAuth(supabase, async () => {
  setupMenu();
  initMap();
});
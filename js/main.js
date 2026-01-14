// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, openNestModal, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

async function refreshUI() {
  const trails = await loadMyTrails(supabase);
  const nests = await loadMyNests(supabase);

  if (ui.trailsList) {
    ui.trailsList.innerHTML = trails.map(t => `
      <div class="card">
        <strong>${t.name}</strong>
        <div class="subtle">${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pts</div>
      </div>
    `).join("");
    ui.trailsEmpty.classList.toggle("hidden", trails.length > 0);
  }
}

ui.navItems.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.target)));
ui.subBtns.forEach(btn => btn.addEventListener("click", () => switchSubTab(btn.dataset.sub)));

ui.btnStartRoute?.addEventListener("click", async () => {
  await createRoute(supabase);
  ui.btnStartRoute.classList.add("hidden");
  ui.btnFinishRoute.classList.remove("hidden");
  ui.btnMarkNest.disabled = false;

  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
    state.lastPos = p;
    addRoutePoint(p.lat, p.lng);
    await appendRoutePoint(supabase, p);
  }, null, { enableHighAccuracy: true });
});

ui.btnFinishRoute?.addEventListener("click", async () => {
  navigator.geolocation.clearWatch(state.watchId);
  await finishRoute(supabase);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  await refreshUI();
});

ui.btnConfirmNest?.addEventListener("click", async () => {
  ui.btnConfirmNest.disabled = true;
  try {
    await createNest(supabase, {
      note: ui.nestNote.value,
      status: ui.nestStatus.value,
      species: ui.nestSpecies.value,
      lat: state.lastPos?.lat,
      lng: state.lastPos?.lng,
      route_id: state.currentRoute?.id,
      photoFile: ui.nestPhoto.files[0]
    });
    closeNestModal();
    toast(ui.routeHint, "Salvo com sucesso!");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
});

bindAuth(supabase, async () => {
  ui.screenLogin.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
  initMap();
  switchTab("view-traps");
  await refreshUI();
});
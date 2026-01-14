// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, addRoutePoint } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest } from "./nests.js";

const supabase = getSupabase();

async function refreshTrails() {
  const trails = await loadMyTrails(supabase);
  ui.trailsList.innerHTML = trails.map(t => `
    <div class="card" style="margin-bottom:10px;">
      <strong>${t.name}</strong><br>
      <small>${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pontos</small>
    </div>
  `).join("");
}

ui.btnStartRoute.addEventListener("click", async () => {
  try {
    await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    
    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
      state.lastPos = p;
      addRoutePoint(p.lat, p.lng);
      if (state.currentRoute) await appendRoutePoint(supabase, p);
    }, null, { enableHighAccuracy: true });
    
    toast(ui.routeHint, "Trilha iniciada!");
  } catch (e) { alert(e.message); }
});

ui.btnFinishRoute.addEventListener("click", async () => {
  navigator.geolocation.clearWatch(state.watchId);
  await finishRoute(supabase);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  await refreshTrails();
});

ui.btnMarkNest.addEventListener("click", () => ui.modalNest.style.display = "flex");
ui.nestCancel.addEventListener("click", closeNestModal);

ui.btnConfirmNest.addEventListener("click", async () => {
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
    toast(ui.routeHint, "Ninho registrado!");
  } catch (e) { alert(e.message); }
});

bindAuth(supabase, async () => {
  initMap();
  await refreshTrails();
});
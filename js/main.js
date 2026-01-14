// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMap } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function setupUIListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  
  document.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if(target === "view-captures") renderCaptures();
      }
    };
  });

  document.getElementById("btnToggleTheme").onclick = () => document.body.classList.toggle("light-theme");
  
  ui.btnLogout.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  ui.userRole.onchange = (e) => ui.meliponicultorFields.classList.toggle("hidden", e.target.value !== "meliponicultor");
  ui.personType.onchange = (e) => ui.cnpjField.classList.toggle("hidden", e.target.value !== "PJ");
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
        addMarker(p.lat, p.lng, "green", "Início");
        setMapCenter(p.lat, p.lng, 18);
      }
      state.routePoints.push(p);
      addRoutePoint(p.lat, p.lng);
      if (state.currentRoute) await appendRoutePoint(supabase, p);
    }, null, { enableHighAccuracy: true });
  } catch (e) { alert(e.message); }
};

ui.btnFinishRoute.onclick = async () => {
  const name = prompt("Nome da Trilha:", state.currentRoute.name);
  navigator.geolocation.clearWatch(state.watchId);
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "red", "Fim");
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
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute.id,
      photoFile: ui.nestPhoto.files[0]
    });
    state.nestsInRoute++;
    ui.nestsCountText.textContent = `${state.nestsInRoute} ninhos marcados`;
    addMarker(state.lastPos.lat, state.lastPos.lng, "orange", `Isca ${state.nestsInRoute}`);
    closeNestModal();
    toast(ui.routeHint, "Isca registrada!");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
};

async function renderCaptures() {
  const nests = await loadMyNests(supabase);
  const container = document.getElementById("capturedList");
  const captured = nests.filter(n => n.status === "CAPTURADO");

  container.innerHTML = captured.map(n => {
    const dCap = new Date(n.captured_at);
    const dias = Math.floor((new Date() - dCap) / (1000 * 60 * 60 * 24));
    const faltam = 35 - dias;
    return `
      <div class="card" style="border-left: 4px solid ${faltam <= 0 ? '#ef4444' : '#22c55e'}">
        <strong>${n.species || 'Espécie Pendente'}</strong>
        <div style="font-size: 13px; margin-top: 5px;">
          ${faltam <= 0 ? "<span style='color:#ef4444'>⚠️ PRONTO PARA RETIRAR</span>" : "⏳ Faltam " + faltam + " dias para maturação"}
        </div>
      </div>
    `;
  }).join("");
}

bindAuth(supabase, async () => {
  setupUIListeners();
  initMap();
});
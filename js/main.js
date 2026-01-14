import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMap } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- TEMA E OFFLINE ---
function setupAppBasics() {
  document.getElementById("btnToggleTheme").onclick = () => {
    document.body.classList.toggle("dark-theme");
    document.body.classList.toggle("light-theme");
  };

  const updateStatus = () => {
    const dot = document.getElementById("onlineDot");
    dot.className = navigator.onLine ? "status-dot" : "status-dot offline";
    document.getElementById("onlineText").textContent = navigator.onLine ? "Online" : "Offline";
  };
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

// --- MENU DRAWER ---
function setupMenu() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  
  document.querySelectorAll(".menu-item").forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if(target === "view-captures") renderMaturationList();
      }
    };
  });
  
  ui.btnLogout.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
}

// --- GPS E TRILHA ---
ui.btnStartRoute.onclick = async () => {
  try {
    const route = await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    clearMap();
    state.nestsInRoute = 0;

    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
      state.lastPos = p;
      
      if(state.routePoints.length === 0) addMarker(p.lat, p.lng, "green", "Início");
      
      state.routePoints.push(p);
      addRoutePoint(p.lat, p.lng);
      setMapCenter(p.lat, p.lng, 18);
      await appendRoutePoint(supabase, p);
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
  loadSummary();
};

ui.btnMarkNest.onclick = () => ui.modalNest.style.display = "flex";

ui.btnConfirmNest.onclick = async () => {
  if(!state.lastPos) return alert("Aguardando sinal GPS...");
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
    document.getElementById("nestsCountText").textContent = state.nestsInRoute;
    addMarker(state.lastPos.lat, state.lastPos.lng, "orange", `Ninho ${state.nestsInRoute}`);
    closeNestModal();
    toast(ui.routeHint, "Isca registrada!");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
};

// --- LOGICA COMERCIAL (35 DIAS) ---
async function renderMaturationList() {
  const nests = await loadMyNests(supabase);
  const container = document.getElementById("capturedList");
  const captured = nests.filter(n => n.status === "CAPTURADO");

  container.innerHTML = captured.map(n => {
    const dataCap = new Date(n.captured_at);
    const diff = Math.floor((new Date() - dataCap) / (1000 * 60 * 60 * 24));
    const faltam = 35 - diff;
    const alertStyle = faltam <= 0 ? "color: #ef4444; font-weight: bold;" : "";
    
    return `
      <div class="card">
        <img src="${n.photo_url || ''}" style="width:100%; height:100px; object-fit:cover; border-radius:8px;">
        <strong>${n.species || 'Espécie pendente'}</strong>
        <div style="${alertStyle}">${faltam <= 0 ? "⚠️ PRONTO PARA RETIRAR" : "⏳ Faltam " + faltam + " dias"}</div>
      </div>
    `;
  }).join("");
}

async function loadSummary() {
  const trails = await loadMyTrails(supabase);
  document.getElementById("trailsSummary").innerHTML = trails.slice(0, 3).map(t => `
    <div class="card"><strong>${t.name}</strong><br><small>${new Date(t.created_at).toLocaleDateString()}</small></div>
  `).join("");
}

bindAuth(supabase, async () => {
  setupAppBasics();
  setupMenu();
  initMap();
  loadSummary();
});
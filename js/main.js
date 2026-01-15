// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js"; // IMPORTAÇÃO CORRIGIDA
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

function calcDist(p1, p2) {
  const R = 6371e3;
  const φ1 = p1.lat * Math.PI/180, φ2 = p2.lat * Math.PI/180;
  const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2) * Math.sin(((p2.lng-p1.lng)*Math.PI/180)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function setupListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  
  if(ui.nestCancel) ui.nestCancel.onclick = closeNestModal;

  // MENU LATERAL
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 200);
      }
    });
  });

  // CARDS DO DASHBOARD (HOME)
  document.querySelectorAll(".dash-card").forEach(card => {
    card.addEventListener("click", () => {
      if(card.classList.contains("disabled")) return;
      const target = card.dataset.target;
      if(target) {
        switchTab(target);
        if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 200);
      }
    });
  });

  // NAV BOTTOM
  ui.navItems.forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.dataset.target);
      if(item.dataset.target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 200);
    });
  });

  ui.btnLogout.onclick = async () => {
    if(confirm("Sair?")) await supabase.auth.signOut();
  };

  window.addEventListener('online', () => setOnlineUI(true));
  window.addEventListener('offline', () => setOnlineUI(false));
}

// --- TRILHA ---

ui.btnStartRoute.onclick = async () => {
  const defaultName = `Trilha ${new Date().toLocaleString("pt-BR")}`;
  let customName = prompt("Nome da Trilha:", defaultName);
  if (customName === null) return;
  if (!customName.trim()) customName = defaultName;

  try {
    await createRoute(supabase, customName);
    
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    
    ui.statusBadge.textContent = "GRAVANDO";
    ui.statusBadge.classList.add("active");
    
    clearMapLayers();
    state._dist = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0";
    ui.gpsStatus.textContent = "Buscando GPS...";
    
    startGPS();
  } catch(e) { alert(e.message); }
};

function startGPS() {
  if (!navigator.geolocation) return alert("Sem GPS.");
  
  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
    state.lastPos = p;
    ui.gpsStatus.textContent = "GPS: OK";

    addRoutePoint(p.lat, p.lng);

    if (state.routePoints.length === 0) {
      setMapCenter(p.lat, p.lng, 18);
      addMarker(p.lat, p.lng, "#10b981", "Início");
    } else {
      const last = state.routePoints[state.routePoints.length - 1];
      state._dist += calcDist(last, p);
      ui.distanceText.textContent = Math.round(state._dist) + " m";
    }
    
    if(navigator.onLine) await appendRoutePoint(supabase, p);

  }, (err) => ui.gpsStatus.textContent = "Erro GPS", { enableHighAccuracy: true });
}

ui.btnFinishRoute.onclick = async () => {
  if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");

  if(navigator.onLine) await finishRoute(supabase);
  
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  
  ui.statusBadge.textContent = "PARADO";
  ui.statusBadge.classList.remove("active");
  ui.gpsStatus.textContent = "GPS: Parado";
  
  await renderTrails();
  toast(ui.routeHint, "Trilha salva!", "ok");
};

ui.btnMarkNest.onclick = () => {
  if(!state.lastPos) return alert("Aguarde GPS.");
  ui.modalNest.style.display = "flex";
};

ui.btnConfirmNest.onclick = async () => {
  ui.btnConfirmNest.textContent = "...";
  try {
    const file = ui.nestPhoto.files[0];
    await createNest(supabase, {
      note: ui.nestNote.value,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24", "Ninho");
    
    // Atualiza contador visual
    let current = parseInt(ui.nestsCountText.textContent) || 0;
    ui.nestsCountText.textContent = current + 1;

    // CORREÇÃO: Fecha o modal após salvar
    closeNestModal();
    toast(ui.routeHint, "Ninho salvo!");

  } catch(e) { alert("Erro: " + e.message); }
  finally { ui.btnConfirmNest.textContent = "Salvar"; }
};

// CORREÇÃO: Renderiza histórico com evento de clique e número de ninhos (estimado)
async function renderTrails() {
  const trails = await loadMyTrails(supabase);
  const list = ui.trailsList;
  if(!list) return;
  
  if(trails.length === 0) {
    list.innerHTML = "";
    ui.trailsEmpty.classList.remove("hidden");
    return;
  }
  ui.trailsEmpty.classList.add("hidden");

  list.innerHTML = trails.map(t => {
    // Estimativa simples de ninhos baseada no JSON (se existir) ou 0
    // Idealmente faríamos uma query count, mas vamos manter simples por agora
    const ninhos = t.nests_count || 0; 
    
    return `
    <div class="route-card" onclick="confirmGoToNests('${t.id}')">
      <div style="display:flex; justify-content:space-between;">
        <strong style="color:white;">${t.name}</strong>
        <span style="font-size:12px; color:#10b981;">${ninhos} ninhos</span>
      </div>
      <div style="font-size:12px; color:#9ca3af; margin-top:5px;">
        ${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pts
      </div>
    </div>
  `}).join("");
}

// Função global para o clique na trilha
window.confirmGoToNests = (routeId) => {
  if(confirm("Ir para 'Minhas Capturas' ver detalhes desta trilha?")) {
    switchTab("view-captures");
    // Futuramente: filtrar capturas por routeId
  }
};

bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  setOnlineUI(navigator.onLine);
  if(state.user) {
    switchTab("view-home");
    loadMyTrails(supabase);
  }
});
// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, discardRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- FUNÇÕES AUXILIARES ---

function calcDist(p1, p2) {
  const R = 6371e3;
  const φ1 = p1.lat * Math.PI/180, φ2 = p2.lat * Math.PI/180;
  const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2) * Math.sin(((p2.lng-p1.lng)*Math.PI/180)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Redesenha o mapa (Correção do mapa cinza/branco)
function refreshMap() {
  setTimeout(() => {
    if(state.map) {
      state.map.invalidateSize();
      // Se tiver posição, centraliza. Se não, tenta localizar.
      if(state.lastPos) {
        setMapCenter(state.lastPos.lat, state.lastPos.lng, 18);
      } else {
        state.map.locate({ setView: true, maxZoom: 18 });
      }
    }
  }, 100);
}

// Navegação Centralizada (Resolve o problema dos botões não funcionarem)
function handleNavigation(targetId) {
  if(!targetId) return;
  
  switchTab(targetId);
  ui.sideMenu.classList.remove("open");
  
  // Se for a tela de trilhas, FORÇA o redesenho do mapa
  if(targetId === "view-traps") {
    refreshMap();
    renderTrails(); // Atualiza lista
  }
}

function setupListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  if(ui.nestCancel) ui.nestCancel.onclick = closeNestModal;

  // 1. MENU LATERAL
  document.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => handleNavigation(item.dataset.target);
  });

  // 2. CARDS DA HOME
  document.querySelectorAll(".dash-card").forEach(card => {
    card.onclick = () => {
      if(!card.classList.contains("disabled")) handleNavigation(card.dataset.target);
    };
  });

  // 3. BARRA INFERIOR (RODAPÉ)
  document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => handleNavigation(item.dataset.target);
  });

  ui.btnLogout.onclick = async () => {
    if(confirm("Sair?")) await supabase.auth.signOut();
  };

  // Monitora Online/Offline
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
    state.nestCount = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0";
    ui.gpsStatus.textContent = "Buscando...";
    
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
    
    // Salva localmente ou na nuvem
    if(navigator.onLine) await appendRoutePoint(supabase, p);

  }, (err) => ui.gpsStatus.textContent = "Erro GPS", { enableHighAccuracy: true });
}

// FINALIZAR TRILHA (Lógica de Descarte)
ui.btnFinishRoute.onclick = async () => {
  if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
  
  // Se não tiver ninhos, joga fora
  if (state.nestCount === 0) {
    if(confirm("Trilha sem ninhos. Descartar?")) {
      await discardRoute(supabase);
      toast(ui.routeHint, "Trilha vazia descartada.", "error");
    } else {
      // Se o usuário insistir em salvar vazia (raro, mas evita travar)
      if(navigator.onLine) await finishRoute(supabase);
    }
  } else {
    // Salva normal
    if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");
    if(navigator.onLine) await finishRoute(supabase);
    toast(ui.routeHint, "Trilha salva!", "ok");
  }
  
  // Reseta UI
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  ui.statusBadge.textContent = "PARADO";
  ui.statusBadge.classList.remove("active");
  
  await renderTrails();
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
    
    state.nestCount = (state.nestCount || 0) + 1;
    ui.nestsCountText.textContent = state.nestCount;
    
    closeNestModal();
    toast(ui.routeHint, "Ninho salvo!");

  } catch(e) { alert("Erro: " + e.message); }
  finally { ui.btnConfirmNest.textContent = "Salvar"; }
};

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
    let ninhosCount = (t.nests && t.nests[0]) ? t.nests[0].count : 0;
    return `
    <div class="route-card">
      <div style="display:flex; justify-content:space-between;">
        <strong style="color:white;">${t.name}</strong>
        <span style="font-size:12px; color:#10b981;">${ninhosCount} ninhos</span>
      </div>
      <div style="font-size:12px; color:#9ca3af; margin-top:5px;">
        ${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pts
      </div>
    </div>
  `}).join("");
}

bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  setOnlineUI(navigator.onLine);
  if(state.user) {
    // Inicia sempre na Home
    handleNavigation("view-home");
    // Carrega trilhas em background
    loadMyTrails(supabase);
  }
});
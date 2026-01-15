// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// Função de distância (Haversine)
function calcDist(p1, p2) {
  const R = 6371e3;
  const φ1 = p1.lat * Math.PI/180;
  const φ2 = p2.lat * Math.PI/180;
  const Δφ = (p2.lat-p1.lat) * Math.PI/180;
  const Δλ = (p2.lng-p1.lng) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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
        if(target === "view-traps") {
          setTimeout(() => state.map && state.map.invalidateSize(), 200);
          renderTrails();
        }
      }
    });
  });

  // Cliques na Bottom Nav
  ui.navItems.forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.dataset.target);
      if(item.dataset.target === "view-traps") {
        setTimeout(() => state.map && state.map.invalidateSize(), 200);
        renderTrails();
      }
    });
  });

  // CORREÇÃO: Seleção direta dos cards do Dashboard para garantir que o clique funcione
  const dashCards = document.querySelectorAll(".dash-card");
  dashCards.forEach(card => {
    card.addEventListener("click", () => {
      if(card.classList.contains("disabled")) return;
      const target = card.dataset.target;
      if(target) {
        switchTab(target);
        if(target === "view-traps") {
          setTimeout(() => state.map && state.map.invalidateSize(), 200);
          renderTrails();
        }
      }
    });
  });

  // Logout
  if(ui.btnLogout) {
    ui.btnLogout.addEventListener("click", async () => {
      if(confirm("Deseja realmente sair?")) {
        await supabase.auth.signOut();
        window.location.reload();
      }
    });
  }
}

// --- LÓGICA DE TRILHA ---

ui.btnStartRoute.onclick = async () => {
  if(!state.user) return alert("Erro: Usuário não identificado. Faça login novamente.");

  const defaultName = `Trilha ${new Date().toLocaleString("pt-BR")}`;
  let customName = prompt("Nome da Trilha:", defaultName);
  
  if (customName === null) return; // Cancelou
  if (!customName.trim()) customName = defaultName;

  ui.btnStartRoute.disabled = true; // Evita duplo clique
  toast(ui.routeHint, "Criando trilha...", "ok");

  try {
    // 1. Cria no banco
    await createRoute(supabase, customName);
    
    // 2. Atualiza UI
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    ui.btnStartRoute.disabled = false;
    
    // 3. Reseta dados visuais
    clearMapLayers();
    state._dist = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0";
    
    toast(ui.routeHint, "Iniciado! Aguardando GPS...", "ok");
    
    // 4. Liga GPS
    startGPS();

  } catch(e) { 
    ui.btnStartRoute.disabled = false;
    alert("Erro ao iniciar trilha: " + e.message); 
  }
};

function startGPS() {
  if (!navigator.geolocation) return alert("Seu dispositivo não tem GPS.");

  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const newPoint = { lat, lng, t: new Date().toISOString() };

    // Desenha
    addRoutePoint(lat, lng);

    // Primeiro ponto?
    if (state.routePoints.length === 0) {
      setMapCenter(lat, lng, 18);
      addMarker(lat, lng, "#22c55e", "Início");
      toast(ui.routeHint, "GPS Ativo. Gravando...", "ok");
    } else {
      // Distância
      const lastPoint = state.routePoints[state.routePoints.length - 1];
      const d = calcDist(lastPoint, newPoint);
      state._dist += d;
      if(state._dist < 1000) ui.distanceText.textContent = Math.round(state._dist) + " m";
      else ui.distanceText.textContent = (state._dist/1000).toFixed(2) + " km";
    }

    // Salva
    await appendRoutePoint(supabase, newPoint);
    state.lastPos = newPoint;

  }, (err) => {
    console.error("Erro GPS:", err);
    toast(ui.routeHint, "Buscando sinal GPS...", "error");
  }, { 
    enableHighAccuracy: true, 
    maximumAge: 0 
  });
}

ui.btnFinishRoute.onclick = async () => {
  if(!state.watchId) return;
  
  navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;

  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");

  try {
    await finishRoute(supabase);
    toast(ui.routeHint, "Trilha salva com sucesso!", "ok");
  } catch(e) {
    alert("Erro ao finalizar: " + e.message);
  }
  
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  
  await renderTrails();
};

ui.btnMarkNest.onclick = () => {
  if(!state.lastPos) {
    alert("Aguardando sinal GPS para marcar a localização.");
    return;
  }
  openNestModal();
};

ui.btnConfirmNest.onclick = async () => {
  ui.btnConfirmNest.disabled = true;
  ui.btnConfirmNest.textContent = "Salvando...";
  
  try {
    const file = ui.nestPhoto.files[0];
    
    await createNest(supabase, {
      note: ui.nestNote.value,
      status: "CATALOGADO", 
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24", "Isca");
    
    let count = parseInt(ui.nestsCountText.textContent) || 0;
    ui.nestsCountText.textContent = count + 1;

    closeNestModal();
    toast(ui.routeHint, "Isca registrada!", "ok");
    
  } catch(e) {
    alert("Erro: " + e.message);
  } finally {
    ui.btnConfirmNest.disabled = false;
    ui.btnConfirmNest.textContent = "Salvar";
  }
};

async function renderTrails() {
  const trails = await loadMyTrails(supabase);
  if(!ui.trailsList) return;

  if(trails.length === 0) {
    ui.trailsList.innerHTML = "";
    ui.trailsEmpty.classList.remove("hidden");
    return;
  }
  ui.trailsEmpty.classList.add("hidden");

  ui.trailsList.innerHTML = trails.map(t => `
    <div class="route-card">
      <div class="route-main">
        <strong>${t.name}</strong>
        <div class="route-meta">
          ${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pts
        </div>
      </div>
      <div class="route-actions">
        <button class="btn-xs">Ver Mapa</button>
      </div>
    </div>
  `).join("");
}

// --- BOOT ---
bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  setOnlineUI(navigator.onLine);
  
  if(state.user) {
    switchTab("view-home");
    // Pré-carrega trilhas em background
    loadMyTrails(supabase); 
  }
});
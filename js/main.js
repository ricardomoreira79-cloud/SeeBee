// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, openNestModal, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- FUNÇÃO AUXILIAR DE DISTÂNCIA ---
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
          switchSubTab("sub-deposit"); // Vai para o mapa por padrão
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
        switchSubTab("sub-deposit");
      }
    });
  });

  // Dashboard Cards
  const dashCards = document.querySelectorAll(".dash-card");
  dashCards.forEach(card => {
    card.addEventListener("click", () => {
      if(card.classList.contains("disabled")) return;
      const target = card.dataset.target;
      if(target) {
        switchTab(target);
        if(target === "view-traps") {
          setTimeout(() => state.map && state.map.invalidateSize(), 200);
          switchSubTab("sub-deposit");
        }
      }
    });
  });

  if(ui.btnLogout) {
    ui.btnLogout.addEventListener("click", async () => {
      if(confirm("Deseja realmente sair?")) {
        await supabase.auth.signOut();
        window.location.reload();
      }
    });
  }
}

// --- TRILHA ---

ui.btnStartRoute.onclick = async () => {
  if(!state.user) return alert("Erro: Faça login novamente.");

  const defaultName = `Trilha ${new Date().toLocaleString("pt-BR")}`;
  let customName = prompt("Nome da Trilha:", defaultName);
  
  if (customName === null) return; 
  if (!customName.trim()) customName = defaultName;

  ui.btnStartRoute.disabled = true; 
  toast(ui.routeHint, "Iniciando...", "ok");

  try {
    await createRoute(supabase, customName);
    
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    
    // Habilita botão de Ninho explicitamente
    ui.btnMarkNest.disabled = false;
    ui.btnStartRoute.disabled = false;
    
    clearMapLayers();
    state._dist = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0";
    
    toast(ui.routeHint, "GPS Ligado. Pode caminhar.", "ok");
    startGPS();

  } catch(e) { 
    ui.btnStartRoute.disabled = false;
    alert("Erro ao iniciar: " + e.message); 
  }
};

function startGPS() {
  if (!navigator.geolocation) return alert("GPS não detectado.");

  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const newPoint = { lat, lng, t: new Date().toISOString() };

    // Guarda posição para usar no botão de ninho
    state.lastPos = newPoint;

    addRoutePoint(lat, lng);

    if (state.routePoints.length === 0) {
      setMapCenter(lat, lng, 18);
      addMarker(lat, lng, "#22c55e", "Início");
    } else {
      const lastPoint = state.routePoints[state.routePoints.length - 1];
      const d = calcDist(lastPoint, newPoint);
      state._dist += d;
      ui.distanceText.textContent = (state._dist < 1000) ? Math.round(state._dist) + " m" : (state._dist/1000).toFixed(2) + " km";
    }

    await appendRoutePoint(supabase, newPoint);

  }, (err) => {
    console.error("GPS Error:", err);
    toast(ui.routeHint, "Buscando sinal...", "error");
  }, { enableHighAccuracy: true, maximumAge: 0 });
}

ui.btnFinishRoute.onclick = async () => {
  if(state.watchId) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");

  try {
    await finishRoute(supabase);
    toast(ui.routeHint, "Trilha salva!", "ok");
  } catch(e) {
    alert("Erro ao salvar: " + e.message);
  }
  
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  
  // AQUI: Troca a aba automaticamente para você ver a trilha
  switchSubTab("sub-trails");
  await renderTrails();
};

// --- MARCAR NINHO ---

ui.btnMarkNest.onclick = () => {
  // Verificação robusta
  if(!state.currentRoute) {
    return alert("Inicie uma trilha primeiro.");
  }
  if(!state.lastPos) {
    // No PC, se o GPS não mexeu, pode estar null. Vamos tentar forçar ou avisar.
    return alert("Aguardando sinal do GPS para marcar local...");
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
      status: ui.nestStatus.value,
      species: ui.nestSpecies.value,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute.id,
      photoFile: file
    });
    
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24", "Isca");
    
    let count = parseInt(ui.nestsCountText.textContent) || 0;
    ui.nestsCountText.textContent = count + 1;

    closeNestModal();
    toast(ui.routeHint, "Ninho salvo!", "ok");
    
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
        <button class="btn-xs" onclick="alert('Visualização de mapa em desenvolvimento')">Ver no Mapa</button>
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
    // Pré-carrega
    loadMyTrails(supabase); 
  }
});
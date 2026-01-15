// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, openNestModal, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- FUNÇÃO AUXILIAR DE DISTÂNCIA (Haversine) ---
function calcDist(p1, p2) {
  const R = 6371e3; // raios da Terra em metros
  const φ1 = p1.lat * Math.PI/180;
  const φ2 = p2.lat * Math.PI/180;
  const Δφ = (p2.lat-p1.lat) * Math.PI/180;
  const Δλ = (p2.lng-p1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function setupListeners() {
  // Menu Lateral e Abas (Mantidos)
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");

  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      if(target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if(target === "view-traps") {
          setTimeout(() => state.map && state.map.invalidateSize(), 100);
          renderTrails(); // Atualiza lista ao entrar
        }
      }
    });
  });

  ui.navItems.forEach(item => {
    item.addEventListener("click", () => {
      switchTab(item.dataset.target);
      if(item.dataset.target === "view-traps") {
        setTimeout(() => state.map && state.map.invalidateSize(), 100);
        renderTrails();
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

// 1. INICIAR (Agora pede o nome ANTES)
ui.btnStartRoute.onclick = async () => {
  // Pergunta o nome antes de começar
  const defaultName = `Trilha ${new Date().toLocaleString("pt-BR")}`;
  let customName = prompt("Nome da Trilha:", defaultName);
  
  if (customName === null) return; // Cancelou
  if (!customName.trim()) customName = defaultName;

  try {
    // Cria a rota no banco
    await createRoute(supabase, customName);
    
    // Ajusta UI
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    
    // Limpa mapa e dados anteriores
    clearMapLayers();
    state._dist = 0;
    ui.distanceText.textContent = "0 m";
    ui.nestsCountText.textContent = "0"; // Reseta contador visual
    
    toast(ui.routeHint, "Trilha iniciada: " + customName, "ok");
    startGPS();

  } catch(e) { 
    alert("Erro ao iniciar: " + e.message); 
  }
};

// 2. RASTREAMENTO GPS
function startGPS() {
  if (!navigator.geolocation) return alert("GPS não suportado.");

  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const newPoint = { lat, lng, t: new Date().toISOString() };

    // Desenha linha
    addRoutePoint(lat, lng);

    // Se for o primeiro ponto, centraliza e marca início
    if (state.routePoints.length === 0) {
      setMapCenter(lat, lng, 18);
      addMarker(lat, lng, "#22c55e", "Início");
    } else {
      // Calcula distância do ponto anterior até este
      const lastPoint = state.routePoints[state.routePoints.length - 1];
      const d = calcDist(lastPoint, newPoint);
      state._dist += d;
      
      // Atualiza texto de distância
      if(state._dist < 1000) ui.distanceText.textContent = Math.round(state._dist) + " m";
      else ui.distanceText.textContent = (state._dist/1000).toFixed(2) + " km";
    }

    // Salva ponto no banco e no estado
    await appendRoutePoint(supabase, newPoint);
    state.lastPos = newPoint;

  }, (err) => console.error("Erro GPS:", err), { 
    enableHighAccuracy: true, 
    maximumAge: 0 
  });
}

// 3. FINALIZAR (Agora só para e salva, pois nome já foi dado)
ui.btnFinishRoute.onclick = async () => {
  if(!state.watchId) return;
  
  navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;

  // Marca pino de fim
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");

  await finishRoute(supabase);
  
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  
  toast(ui.routeHint, "Trilha finalizada e salva!", "ok");
  
  // Atualiza a lista lá embaixo imediatamente
  await renderTrails();
};

// --- MARCAÇÃO DE NINHOS ---

ui.btnMarkNest.onclick = () => {
  // Pega localização atual para o form
  if(!state.lastPos) {
    alert("Aguardando sinal GPS...");
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
      status: ui.nestStatus.value,
      species: ui.nestSpecies.value,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    
    // Marca no mapa imediatamente
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24", "Isca");
    
    // Atualiza contador visual na hora
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

// --- RENDERIZAR LISTAS ---

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
          ${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pontos
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
  
  // Se já estiver logado, carrega trilhas
  if(state.user) {
    switchTab("view-home");
    await renderTrails();
  }
});
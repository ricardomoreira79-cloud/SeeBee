// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
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

  if(ui.menuItems) {
    ui.menuItems.forEach(item => {
      item.onclick = () => {
        const target = item.dataset.target;
        if(target) {
          switchTab(target);
          ui.sideMenu.classList.remove("open");
          // Se for para trilhas, ajusta o mapa
          if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 200);
        }
      };
    });
  }

  // Dashboard Cards
  const dashCards = document.querySelectorAll(".dash-card");
  dashCards.forEach(card => {
    card.onclick = () => {
      if(card.classList.contains("disabled")) return;
      const target = card.dataset.target;
      if(target) {
        switchTab(target);
        if(target === "view-traps") setTimeout(() => state.map && state.map.invalidateSize(), 200);
      }
    };
  });

  ui.btnLogout.onclick = async () => {
    if(confirm("Sair?")) await supabase.auth.signOut();
  };

  // DETECÇÃO OFFLINE/ONLINE ROBUSTA
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
    
    // Se estiver online, salva. Se não, (futuramente) guarda local.
    if(navigator.onLine) await appendRoutePoint(supabase, p);

  }, (err) => ui.gpsStatus.textContent = "GPS: Erro", { enableHighAccuracy: true });
}

ui.btnFinishRoute.onclick = async () => {
  if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
  if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444", "Fim");

  if(navigator.onLine) await finishRoute(supabase);
  else alert("Aviso: Sem internet. A finalização será sincronizada depois (Futuro).");
  
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
  if(!state.lastPos) return alert("Aguarde o sinal do GPS.");
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
    ui.nestsCountText.textContent = (parseInt(ui.nestsCountText.textContent)||0) + 1;
    closeNestModal();
  } catch(e) { alert(e.message); }
  finally { ui.btnConfirmNest.textContent = "Salvar Registro"; }
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
      <strong style="color:white; display:block; margin-bottom:4px;">${t.name}</strong>
      <div style="font-size:12px; color:#9ca3af;">
        ${new Date(t.created_at).toLocaleDateString()} • ${t.path?.length || 0} pts
      </div>
    </div>
  `).join("");
}

// --- INICIALIZAÇÃO ---
bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  
  // Atualiza UI Offline/Online imediatamente
  setOnlineUI(navigator.onLine);

  if(state.user) {
    // CORREÇÃO: Vai para a HOME (Dashboard) ao invés das trilhas
    switchTab("view-home");
    // Carrega trilhas em background para quando o usuário clicar
    loadMyTrails(supabase);
  }
});
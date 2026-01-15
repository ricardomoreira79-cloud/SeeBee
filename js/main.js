// js/main.js - ARQUIVO COMPLETO
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal, setOnlineUI } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMapLayers } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, discardRoute, loadMyTrails } from "./routes.js";
import { createNest } from "./nests.js";

const supabase = getSupabase();
let detailMap = null;

// --- MAPA DE DETALHES (HISTÓRICO) ---
function initDetailMap() {
  if (detailMap) return;
  detailMap = L.map("mapDetail").setView([0,0], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(detailMap);
}

// --- FUNÇÕES AUXILIARES ---
function calcDist(p1, p2) {
  const R = 6371e3;
  const φ1 = p1.lat * Math.PI/180, φ2 = p2.lat * Math.PI/180;
  const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2) * Math.sin(((p2.lng-p1.lng)*Math.PI/180)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function refreshMap() {
  setTimeout(() => {
    if(state.map) {
      state.map.invalidateSize();
      if(state.lastPos) setMapCenter(state.lastPos.lat, state.lastPos.lng, 18);
      else state.map.locate({ setView: true, maxZoom: 18 });
    }
  }, 100);
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupListeners() {
  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
  if(ui.nestCancel) ui.nestCancel.onclick = closeNestModal;

  // Navegação Global
  const navigate = (target) => {
    switchTab(target);
    ui.sideMenu.classList.remove("open");
    if(target === "view-traps") refreshMap();
    if(target === "view-meliponaries") loadColoniesData(); // Carrega dados ao abrir
  };

  document.querySelectorAll("[data-target]").forEach(el => {
    el.addEventListener("click", () => navigate(el.dataset.target));
  });

  // LOGOUT
  ui.btnLogout.onclick = async () => { if(confirm("Sair?")) await supabase.auth.signOut(); };
  
  window.addEventListener('online', () => setOnlineUI(true));
  window.addEventListener('offline', () => setOnlineUI(false));

  // --- NOVA LÓGICA DE GESTÃO (COLÔNIAS) ---
  
  // Abas
  document.querySelectorAll(".segment-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.sub).classList.remove("hidden");
    };
  });

  // Modal de Matrizes
  document.getElementById("btnAddColony").onclick = () => {
    loadSpeciesList();
    document.getElementById("colony-modal").style.display = "flex";
  };
  document.getElementById("colonyCancel").onclick = () => document.getElementById("colony-modal").style.display = "none";
  
  document.getElementById("colonyStatus").onchange = (e) => {
    const group = document.getElementById("removalDateGroup");
    if(e.target.value !== "ATIVA") group.classList.remove("hidden");
    else {
      group.classList.add("hidden");
      document.getElementById("colonyRemovalDate").value = "";
    }
  };

  document.getElementById("colonySave").onclick = saveColony;
  
  // Filtro de Histórico
  document.getElementById("historyDateFilter").onchange = loadColoniesData;

  // Modal de Detalhe de Trilha
  document.getElementById("closeDetailTrail").onclick = () => document.getElementById("trail-detail-modal").style.display = "none";
}

// --- FUNÇÕES DE NEGÓCIO: COLÔNIAS ---

async function loadSpeciesList() {
  const datalist = document.getElementById("speciesList");
  if(datalist.options.length > 0) return; // Cache

  const { data } = await supabase.from("species").select("popular_name, scientific_name");
  if(data) {
    datalist.innerHTML = data.map(s => `<option value="${s.popular_name} - ${s.scientific_name}">`).join("");
  }
}

async function saveColony() {
  const name = document.getElementById("colonyName").value;
  const species = document.getElementById("colonySpeciesInput").value || "Não identificada";
  const date = document.getElementById("colonyDate").value;
  const status = document.getElementById("colonyStatus").value;
  const removal = document.getElementById("colonyRemovalDate").value;

  if(!name || !date) return alert("Preencha nome e data de instalação.");
  if(status !== "ATIVA") {
    if(!removal) return alert("Preencha a data de remoção.");
    if(new Date(removal) < new Date(date)) return alert("Data de remoção inválida.");
  }

  const { error } = await supabase.from("colonies").insert({
    user_id: state.user.id,
    name, species_name: species, installation_date: date, status, 
    removal_date: removal ? removal : null
  });

  if(error) alert("Erro: " + error.message);
  else {
    document.getElementById("colony-modal").style.display = "none";
    loadColoniesData(); // Atualiza lista
  }
}

async function loadColoniesData() {
  // 1. Carregar Matrizes
  const { data: colonies } = await supabase.from("colonies")
    .select("*").eq("user_id", state.user.id).order("installation_date", {ascending: false});
  
  const list = document.getElementById("coloniesList");
  if(!colonies || colonies.length === 0) list.innerHTML = "<div class='empty-state' style='padding:20px; text-align:center; color:#9ca3af'>Nenhuma matriz cadastrada.</div>";
  else {
    list.innerHTML = colonies.map(c => `
      <div class="route-card">
        <div style="display:flex; justify-content:space-between;">
          <strong>${c.name}</strong>
          <span class="badge-status ${c.status === 'ATIVA' ? 'active' : ''}">${c.status}</span>
        </div>
        <div style="font-size:12px; color:#9ca3af; margin-top:5px;">${c.species_name}</div>
        <div style="font-size:11px; margin-top:2px;">Instalado: ${new Date(c.installation_date).toLocaleDateString()}</div>
      </div>
    `).join("");
  }

  // 2. Carregar Histórico de Trilhas (Com Filtro)
  const dateFilter = document.getElementById("historyDateFilter").value;
  let query = supabase.from("routes").select("*, nests(count)").eq("user_id", state.user.id).eq("status", "finished").order("created_at", { ascending: false });
  
  if(dateFilter) {
    // Filtra pelo dia exato (comparação simples de string date ISO)
    query = query.gte("created_at", dateFilter + "T00:00:00").lte("created_at", dateFilter + "T23:59:59");
  } else {
    query = query.limit(5); // Se não tem filtro, mostra só as ultimas 5
  }

  const { data: trails } = await query;
  const histList = document.getElementById("trailsListHistory");

  if(!trails || trails.length === 0) histList.innerHTML = "<div class='empty-state' style='padding:20px; text-align:center; color:#9ca3af'>Nenhuma trilha encontrada.</div>";
  else {
    histList.innerHTML = trails.map(t => {
      const ninhos = (t.nests && t.nests[0]) ? t.nests[0].count : 0;
      return `
      <div class="route-card" onclick="window.openTrailDetail('${t.id}')">
        <div style="display:flex; justify-content:space-between;">
          <strong>${t.name}</strong>
          <span style="color:#10b981; font-size:12px;">${ninhos} ninhos</span>
        </div>
        <div style="font-size:12px; color:#9ca3af; margin-top:5px;">${new Date(t.created_at).toLocaleString()}</div>
      </div>
    `}).join("");
  }
}

// --- DETALHES DA TRILHA ---
window.openTrailDetail = async (trailId) => {
  document.getElementById("trail-detail-modal").style.display = "flex";
  setTimeout(() => { initDetailMap(); detailMap.invalidateSize(); }, 200);

  const { data: route } = await supabase.from("routes").select("*").eq("id", trailId).single();
  const { data: nests } = await supabase.from("nests").select("*").eq("route_id", trailId);

  if(!route) return;

  // Limpa mapa anterior
  detailMap.eachLayer(layer => { if(layer instanceof L.Marker || layer instanceof L.Polyline) detailMap.removeLayer(layer); });

  // Desenha Rota
  if(route.path && route.path.length > 0) {
    const latlngs = route.path.map(p => [p.lat, p.lng]);
    const poly = L.polyline(latlngs, {color: '#ef4444', weight: 4}).addTo(detailMap);
    detailMap.fitBounds(poly.getBounds());
  }

  // Lista Ninhos
  const divList = document.getElementById("detailNestsList");
  divList.innerHTML = "";

  if(nests) {
    nests.forEach((n, i) => {
      L.marker([n.lat, n.lng]).addTo(detailMap).bindPopup(`Ninho ${i+1}`);
      
      const img = n.photo_url ? n.photo_url : "https://placehold.co/50x50?text=S/F";
      divList.innerHTML += `
        <div style="display:flex; gap:10px; padding:10px; border-bottom:1px solid #374151; align-items:center;">
          <img src="${img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; cursor:pointer;" onclick="window.open('${img}')">
          <div>
            <div style="font-weight:bold; color:white;">Ninho ${i+1}</div>
            <div style="font-size:11px; color:#9ca3af;">${n.status}</div>
          </div>
        </div>
      `;
    });
  }
};

// --- TRILHA: GRAVAÇÃO (LÓGICA ANTERIOR) ---
ui.btnStartRoute.onclick = async () => {
  const name = prompt("Nome da Trilha:", `Trilha ${new Date().toLocaleDateString()}`);
  if(!name) return;
  await createRoute(supabase, name);
  ui.btnStartRoute.classList.add("hidden");
  ui.btnFinishRoute.classList.remove("hidden");
  ui.btnMarkNest.disabled = false;
  ui.statusBadge.textContent = "GRAVANDO";
  ui.statusBadge.classList.add("active");
  clearMapLayers();
  state._dist = 0; state.nestCount = 0;
  ui.distanceText.textContent = "0 m"; ui.nestsCountText.textContent = "0";
  startGPS();
};

function startGPS() {
  if (!navigator.geolocation) return alert("Sem GPS");
  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
    state.lastPos = p;
    ui.gpsStatus.textContent = "GPS: OK";
    addRoutePoint(p.lat, p.lng);
    if(state.routePoints.length === 0) setMapCenter(p.lat, p.lng);
    else {
      const last = state.routePoints[state.routePoints.length - 1];
      state._dist += calcDist(last, p);
      ui.distanceText.textContent = Math.round(state._dist) + " m";
    }
    if(navigator.onLine) await appendRoutePoint(supabase, p);
  }, (e) => ui.gpsStatus.textContent = "Erro GPS", {enableHighAccuracy:true});
}

ui.btnFinishRoute.onclick = async () => {
  if(state.watchId) navigator.geolocation.clearWatch(state.watchId);
  if(state.nestCount === 0) {
    if(confirm("Trilha sem ninhos. Descartar?")) {
      await discardRoute(supabase);
      toast(ui.routeHint, "Descartada", "error");
    } else if(navigator.onLine) await finishRoute(supabase);
  } else {
    if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "#ef4444");
    if(navigator.onLine) await finishRoute(supabase);
    toast(ui.routeHint, "Salva!", "ok");
  }
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  ui.statusBadge.textContent = "PARADO";
  ui.statusBadge.classList.remove("active");
};

ui.btnMarkNest.onclick = () => {
  if(!state.lastPos) return alert("Aguarde GPS");
  document.getElementById("nest-modal").style.display = "flex";
};

ui.btnConfirmNest.onclick = async () => {
  ui.btnConfirmNest.textContent = "...";
  try {
    const file = document.getElementById("nestPhoto").files[0];
    await createNest(supabase, {
      note: document.getElementById("nestNote").value,
      lat: state.lastPos.lat, lng: state.lastPos.lng,
      route_id: state.currentRoute.id, photoFile: file
    });
    addMarker(state.lastPos.lat, state.lastPos.lng, "#fbbf24");
    state.nestCount = (state.nestCount || 0) + 1;
    ui.nestsCountText.textContent = state.nestCount;
    closeNestModal();
    toast(ui.routeHint, "Ninho salvo");
  } catch(e) { alert(e.message); }
  finally { ui.btnConfirmNest.textContent = "Salvar"; }
};

// --- BOOT ---
bindAuth(supabase, async () => {
  setupListeners();
  initMap();
  setOnlineUI(navigator.onLine);
  if(state.user) {
    // Inicia na Home
    switchTab("view-home");
  }
});
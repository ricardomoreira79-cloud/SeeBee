import { state } from "./state.js";
import { ui, openNestModal, openPhotoModal } from "./ui.js";
import { persistLocalRoutes, loadLocalRoutes } from "./storage.js";
import { supabaseClient } from "./auth.js";
import { updateUserMarker, clearMapLayers } from "./map.js";

// Função auxiliar para gerar ID único para os ninhos
function generateUUID() {
    return crypto.randomUUID();
}

export function calculateTotalDistance(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const a_val = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a_val), Math.sqrt(1 - a_val));
  return R * c;
}

/* ============ GRAVAÇÃO DE TRILHA ============ */

export function startRoute() {
  if (!navigator.geolocation) { alert("Seu dispositivo não suporta GPS."); return; }
  state.currentRoute = {
    id: null, name: "", created_at: new Date().toISOString(),
    path: [], nests: [], totalDistance: 0, synced: state.isOnline,
  };
  clearMapLayers();
  state.pathLayer = L.polyline([], { color: "#22c55e", weight: 4 }).addTo(state.map);
  ui.btnAddNest.disabled = false;
  ui.badgeStatus.textContent = "Gravando";
  ui.badgeStatus.style.borderColor = "#238636";
  ui.badgeStatus.style.color = "#238636";
  ui.btnToggleText.textContent = "Finalizar";
  ui.btnToggleIcon.textContent = "⏹";
  ui.btnToggleRoute.style.background = "#da3633";
  ui.infoRouteName.textContent = "Trajeto: em gravação...";
  ui.infoDistance.textContent = "0 m";
  ui.infoNests.textContent = "0";

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const point = { lat: latitude, lng: longitude, t: new Date().toISOString() };
      state.currentRoute.path.push(point);
      updateUserMarker(latitude, longitude);
      state.pathLayer.addLatLng([latitude, longitude]);
      const d = calculateTotalDistance(state.currentRoute.path);
      state.currentRoute.totalDistance = d;
      ui.infoDistance.textContent = d.toFixed(0) + " m";
      state.map.panTo([latitude, longitude], { animate: true });
    },
    (error) => { console.error(error); ui.infoGps.textContent = "GPS: erro"; },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

export async function stopRoute() {
  if (state.watchId !== null) { navigator.geolocation.clearWatch(state.watchId); state.watchId = null; }
  ui.btnAddNest.disabled = true;
  ui.badgeStatus.textContent = "Parado";
  ui.badgeStatus.style.borderColor = "#30363d";
  ui.badgeStatus.style.color = "#8b949e";
  ui.btnToggleText.textContent = "Iniciar trajeto";
  ui.btnToggleIcon.textContent = "▶";
  ui.btnToggleRoute.style.background = "#238636";

  const route = state.currentRoute;
  state.currentRoute = null;

  if (!route || route.path.length < 2) {
    alert("Poucos pontos. O trajeto foi descartado.");
    clearMapLayers();
    ui.infoRouteName.textContent = "Trajeto: —";
    ui.infoDistance.textContent = "0 m";
    ui.infoNests.textContent = "0";
    return;
  }
  const now = new Date();
  const defaultName = `Instalação ${now.toLocaleDateString("pt-BR")}`;
  const name = prompt("Nome desta instalação:", defaultName);
  route.name = name || defaultName;
  ui.infoRouteName.textContent = "Trajeto: " + route.name;
  await saveRoute(route);
}

export async function handleAddNest() {
  if (!state.currentRoute || state.currentRoute.path.length === 0) { alert("Comece o trajeto antes."); return; }
  const lastPoint = state.currentRoute.path[state.currentRoute.path.length - 1];
  const modalResult = await openNestModal();
  if (!modalResult) return;
  const { description, file } = modalResult;
  let photoUrl = null;
  if (file) {
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `ninho-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      if (state.isOnline) {
        const { error } = await supabaseClient.storage.from("ninhos-fotos").upload(filePath, file, { contentType: file.type });
        if (!error) {
          const { data } = supabaseClient.storage.from("ninhos-fotos").getPublicUrl(filePath);
          photoUrl = data.publicUrl;
        }
      } else {
        alert("Offline: foto não enviada.");
      }
    } catch (e) { console.error(e); }
  }
  
  // CRÍTICO: Criação do objeto ninho com ID e Status inicial
  const nest = { 
      id: generateUUID(), // Gera ID único
      lat: lastPoint.lat, 
      lng: lastPoint.lng, 
      description: description || "", 
      photoUrl, 
      status: 'catalogado', // Status inicial
      created_at: new Date().toISOString() 
  };

  state.currentRoute.nests.push(nest);
  ui.infoNests.textContent = state.currentRoute.nests.length;
  const marker = L.marker([nest.lat, nest.lng]).addTo(state.nestsLayerGroup);
  if (photoUrl) {
    marker.bindPopup(`<div style="font-size:12px"><strong>Ninho Catalogado</strong><br><img src="${photoUrl}" style="max-width:100px;border-radius:4px;margin-top:4px"/><br>${nest.description}</div>`);
  } else {
    marker.bindPopup(`Ninho: ${nest.description}`);
  }
}

/* ============ SINCRONIZAÇÃO E RENDERIZAÇÃO ============ */

async function loadCloudRoutes() {
  if (!state.isOnline) return [];
  try {
    const { data, error } = await supabaseClient.from("routes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id, name: row.name, created_at: row.created_at,
      path: row.path || [], nests: row.traps || [], // 'traps' do banco vira 'nests' localmente
      totalDistance: calculateTotalDistance(row.path || []), synced: true,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function syncRoutes() {
  const local = loadLocalRoutes();
  if (state.isOnline) {
    for (const r of local) {
      if (!r.id) {
        try {
          const { data, error } = await supabaseClient.from("routes").insert({ name: r.name, path: r.path, traps: r.nests }).select().single();
          if (!error && data) { r.id = data.id; r.synced = true; }
        } catch (e) {}
      }
    }
  }
  const cloud = await loadCloudRoutes();
  let merged = [];
  if (state.isOnline) {
    merged = [...cloud];
    for (const r of local) {
      if (!r.id) merged.push(r);
      else if (!merged.some((c) => c.id === r.id)) merged.push(r);
    }
  } else { merged = [...local]; }
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.allRoutes = merged;
  persistLocalRoutes(state.allRoutes);
}

export async function saveRoute(route) {
  state.allRoutes.unshift(route);
  persistLocalRoutes(state.allRoutes);
  if (state.isOnline) {
    try {
      // Salva 'nests' na coluna 'traps'
      const { data, error } = await supabaseClient.from("routes").insert({ name: route.name, path: route.path, traps: route.nests }).select().single();
      if (!error && data) { route.id = data.id; route.synced = true; persistLocalRoutes(state.allRoutes); }
    } catch (e) { console.error(e); }
  }
  renderRoutesList();
}

// === NOVA LÓGICA DE RENDERIZAÇÃO (COM STATUS) ===

// Callbacks para lidar com a edição/exclusão vindas do modal
let handleNestUpdateCallback = null;
let handleNestDeleteCallback = null;

export function registerNestActionHandlers(updateCb, deleteCb) {
    handleNestUpdateCallback = updateCb;
    handleNestDeleteCallback = deleteCb;
}

export function renderRoutesList() {
  ui.latestRouteContainer.innerHTML = "";
  if (state.allRoutes.length > 0) {
    const latest = state.allRoutes[0];
    const card = createRouteCard(latest, false);
    ui.latestRouteContainer.appendChild(card);
  } else {
    ui.latestRouteContainer.innerHTML = '<div class="empty-placeholder">Nenhuma instalação recente.</div>';
  }

  ui.fullHistoryList.innerHTML = "";
  if (state.allRoutes.length > 0) {
    state.allRoutes.forEach(route => {
      const card = createRouteCard(route, true);
      ui.fullHistoryList.appendChild(card);
    });
  } else {
    ui.fullHistoryList.innerHTML = '<div class="empty-placeholder">Histórico vazio.</div>';
  }
}

function createRouteCard(route, enableGallery) {
  const div = document.createElement("div");
  div.className = "history-card";
  
  const dateObj = new Date(route.created_at || Date.now());
  const dateStr = dateObj.toLocaleDateString("pt-BR") + " " + dateObj.toLocaleTimeString("pt-BR", {hour:'2-digit', minute:'2-digit'});
  const distStr = (route.totalDistance || 0).toFixed(0) + " m";
  
  // Filtra apenas ninhos que NÃO foram removidos para a contagem
  const activeNests = (route.nests || []).filter(n => n.status !== 'removido');
  const nestsCount = activeNests.length;
  
  div.innerHTML = `
    <div class="history-header-row">
      <div class="history-main-info">
        <strong>${route.name}</strong>
        <div class="history-meta">${dateStr}</div>
        <div class="history-stats">
            <span>📏 ${distStr}</span>
            <span>📦 ${nestsCount} Ninhos Ativos</span>
        </div>
      </div>
    </div>
  `;

  // Filtra ninhos com foto que NÃO foram removidos para a galeria
  const photos = (route.nests || []).filter(n => n.photoUrl && n.status !== 'removido');
  
  if (enableGallery && photos.length > 0) {
    const galleryDiv = document.createElement("div");
    galleryDiv.className = "history-gallery";
    
    const label = document.createElement("div");
    label.className = "gallery-label";
    label.textContent = "Ninhos instalados:";
    galleryDiv.appendChild(label);

    photos.forEach(nestData => {
      // Container para thumb + status
      const thumbContainer = document.createElement("div");
      thumbContainer.className = "nest-thumb-container";

      const img = document.createElement("img");
      img.src = nestData.photoUrl;
      img.className = "thumb-small";
      
      // Aplica borda verde se capturado
      if (nestData.status === 'capturado') {
          img.classList.add('capturado');
      }

      img.onclick = (e) => {
        e.stopPropagation();
        // Abre modal passando os dados do ninho e os callbacks de ação
        openPhotoModal(nestData, route.id, handleNestUpdateCallback, handleNestDeleteCallback);
      };
      
      // Texto de Status abaixo da imagem
      const statusText = document.createElement("div");
      statusText.className = "thumb-status";
      let statusLabel = "Catalogado";
      if(nestData.status === 'capturado') {
          statusLabel = "Capturado 🐝";
          statusText.classList.add('capturado');
      }

      statusText.textContent = statusLabel;

      thumbContainer.appendChild(img);
      thumbContainer.appendChild(statusText);
      galleryDiv.appendChild(thumbContainer);
    });
    div.appendChild(galleryDiv);
  }

  return div;
}
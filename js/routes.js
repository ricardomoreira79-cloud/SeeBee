import { state } from "./state.js";
import { ui, openNestModal, openPhotoModal } from "./ui.js";
import { persistLocalRoutes, loadLocalRoutes } from "./storage.js";
import { supabaseClient } from "./auth.js";
import { updateUserMarker, clearMapLayers, drawRouteOnMap } from "./map.js";

// Função para gerar ID único
function generateUUID() {
  return crypto.randomUUID();
}

// Cálculo de distância
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
  const v = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

// --- FUNÇÕES PRINCIPAIS EXPORTADAS ---

export function startRoute() {
  if (!navigator.geolocation) { alert("GPS não suportado."); return; }
  
  state.currentRoute = {
    id: null, name: "", created_at: new Date().toISOString(),
    path: [], nests: [], totalDistance: 0, synced: state.isOnline
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
  ui.infoRouteName.textContent = "Trajeto: gravando...";
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
    (err) => { console.error(err); ui.infoGps.textContent = "GPS: erro"; },
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
    alert("Poucos pontos. Descartado.");
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
  if (!state.currentRoute || state.currentRoute.path.length === 0) {
    alert("Comece o trajeto antes.");
    return;
  }
  
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

  const nest = {
    id: generateUUID(),
    lat: lastPoint.lat,
    lng: lastPoint.lng,
    description: description || "",
    photoUrl,
    status: 'catalogado',
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

// --- SINCRONIZAÇÃO E LISTAGEM ---

async function loadCloudRoutes() {
  if (!state.isOnline) return [];
  try {
    const { data, error } = await supabaseClient.from("routes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id, name: row.name, created_at: row.created_at,
      path: row.path || [], nests: row.traps || [],
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
  } else {
    merged = [...local];
  }
  
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  state.allRoutes = merged;
  persistLocalRoutes(state.allRoutes);
}

export async function saveRoute(route) {
  state.allRoutes.unshift(route);
  persistLocalRoutes(state.allRoutes);
  
  if (state.isOnline) {
    try {
      const { data, error } = await supabaseClient.from("routes").insert({ name: route.name, path: route.path, traps: route.nests }).select().single();
      if (!error && data) { route.id = data.id; route.synced = true; persistLocalRoutes(state.allRoutes); }
    } catch (e) { console.error(e); }
  }
  
  renderRoutesList();
}

// Callbacks para UI
let handleNestUpdateCallback = null;
let handleNestDeleteCallback = null;

export function registerNestActionHandlers(updateCb, deleteCb) {
    handleNestUpdateCallback = updateCb;
    handleNestDeleteCallback = deleteCb;
}

export function renderRoutesList() {
  // Lista Resumida (Último)
  if (ui.latestRouteContainer) {
      ui.latestRouteContainer.innerHTML = "";
      if (state.allRoutes.length > 0) {
        const latest = state.allRoutes[0];
        ui.latestRouteContainer.appendChild(createRouteCard(latest, false));
      } else {
        ui.latestRouteContainer.innerHTML = '<div class="empty-placeholder">Nenhuma instalação recente.</div>';
      }
  }

  // Lista Completa
  if (ui.fullHistoryList) {
      ui.fullHistoryList.innerHTML = "";
      if (state.allRoutes.length > 0) {
        state.allRoutes.forEach(route => {
          ui.fullHistoryList.appendChild(createRouteCard(route, true));
        });
      } else {
        ui.fullHistoryList.innerHTML = '<div class="empty-placeholder">Histórico vazio.</div>';
      }
  }
  
  // Renderizar capturas
  renderCapturesList();
}

// Função auxiliar para criar cards
function createRouteCard(route, enableGallery) {
  const div = document.createElement("div");
  div.className = "history-card";
  
  const dateObj = new Date(route.created_at || Date.now());
  const dateStr = dateObj.toLocaleDateString("pt-BR") + " " + dateObj.toLocaleTimeString("pt-BR", {hour:'2-digit', minute:'2-digit'});
  const distStr = (route.totalDistance || 0).toFixed(0) + " m";
  
  const activeNests = (route.nests || []).filter(n => n.status !== 'removido');
  const capturedCount = activeNests.filter(n => n.status === 'capturado').length;
  
  div.innerHTML = `
    <div class="history-header-row">
      <div class="history-main-info">
        <strong>${route.name}</strong>
        <div class="history-meta">${dateStr}</div>
        <div class="history-stats">
            <span>📏 ${distStr}</span>
            <span>📦 ${activeNests.length} Ninhos</span>
            <span style="color: ${capturedCount > 0 ? '#22c55e' : 'inherit'}">🐝 ${capturedCount} Capturas</span>
        </div>
      </div>
    </div>
  `;

  const photos = (route.nests || []).filter(n => n.photoUrl && n.status !== 'removido');
  
  if (enableGallery && photos.length > 0) {
    const galleryDiv = document.createElement("div");
    galleryDiv.className = "history-gallery";
    
    const label = document.createElement("div");
    label.className = "gallery-label";
    label.textContent = "Ninhos instalados:";
    galleryDiv.appendChild(label);

    photos.forEach(nestData => {
      const thumbContainer = document.createElement("div");
      thumbContainer.className = "nest-thumb-container";

      const img = document.createElement("img");
      img.src = nestData.photoUrl;
      img.className = "thumb-small";
      
      if (nestData.status === 'capturado') img.classList.add('capturado');

      img.onclick = (e) => {
        e.stopPropagation();
        openPhotoModal(nestData, route.id, handleNestUpdateCallback, handleNestDeleteCallback);
      };
      
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

export function renderCapturesList() {
  if (!ui.capturesList) return;
  ui.capturesList.innerHTML = "";
  let totalCaptures = 0;
  
  state.allRoutes.forEach(route => {
    const capturedNests = (route.nests || []).filter(n => n.status === 'capturado');
    if (capturedNests.length === 0) return;
    
    totalCaptures += capturedNests.length;
    
    const div = document.createElement("div"); div.className = "history-card";
    const dateObj = new Date(route.created_at);
    div.innerHTML = `<div class="history-header-row"><div class="history-main-info"><strong>${route.name}</strong><div class="history-meta">${dateObj.toLocaleDateString("pt-BR")}</div></div></div>`;
    
    const galleryDiv = document.createElement("div"); galleryDiv.className = "history-gallery";
    
    capturedNests.forEach(nest => {
       const thumbContainer = document.createElement("div"); thumbContainer.className = "nest-thumb-container";
       const img = document.createElement("img"); img.src = nest.photoUrl || ""; img.className = "thumb-small capturado";
       img.onclick = (e) => { e.stopPropagation(); openPhotoModal(nest, route.id, handleNestUpdateCallback, handleNestDeleteCallback); };
       
       const capturedDate = new Date(nest.captured_at || nest.created_at);
       const today = new Date();
       const diffTime = Math.abs(today - capturedDate);
       const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
       const remaining = 35 - diffDays;
       
       const daysText = document.createElement("div"); daysText.className = "thumb-days";
       if (remaining <= 0) { daysText.textContent = "RETIRAR"; daysText.classList.add("ready"); } else { daysText.textContent = `${remaining} dias`; }
       
       thumbContainer.appendChild(img); thumbContainer.appendChild(daysText); galleryDiv.appendChild(thumbContainer);
    });
    div.appendChild(galleryDiv);
    ui.capturesList.appendChild(div);
  });
  
  if (totalCaptures > 0) {
    if(ui.badgeCapturas) { ui.badgeCapturas.textContent = totalCaptures; ui.badgeCapturas.classList.remove("hidden"); }
    // Atualiza o novo badge inferior também
    if(ui.badgeCapturasBottom) { ui.badgeCapturasBottom.textContent = totalCaptures; ui.badgeCapturasBottom.classList.remove("hidden"); }
    if(ui.cardBadgeCaptures) { ui.cardBadgeCaptures.textContent = totalCaptures; ui.cardBadgeCaptures.classList.remove("hidden"); }
  } else {
    ui.capturesList.innerHTML = '<div class="empty-placeholder">Nenhuma captura ativa no momento.</div>';
    if(ui.badgeCapturas) ui.badgeCapturas.classList.add("hidden");
    if(ui.badgeCapturasBottom) ui.badgeCapturasBottom.classList.add("hidden");
    if(ui.cardBadgeCaptures) ui.cardBadgeCaptures.classList.add("hidden");
  }
}
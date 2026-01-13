import { getSupabase } from "./supabaseClient.js";
import { state, resetSessionState } from "./state.js";
import { ui, toast, switchTab, setOnlineUI, openNestModal, closeNestModal } from "./ui.js";
import { CONFIG } from "./config.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addNestMarker, resetMapOverlays } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js"; 
import { loadProfile } from "./profile.js";         // <--- Novo
import { loadMeliponaries } from "./meliponario.js";; // <--- Novo

const supabase = getSupabase();

// --- Lógica GPS (Haversine) ---
function metersBetween(a, b) {
  const R = 6371000; 
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1-s1));
}

// --- GPS Watcher ---
function startWatchingGPS() {
  if (!navigator.geolocation) return toast(ui.routeHint, "Sem suporte a GPS", "error");
  
  state.watchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    
    addRoutePoint(lat, lng);
    state.lastPos = { lat, lng, ts: new Date().toISOString() };
    
    if(state.routePoints.length > 0) {
      state._dist = (state._dist || 0) + metersBetween(state.routePoints[state.routePoints.length-1], state.lastPos);
      ui.distanceText.textContent = (state._dist < 1000) ? Math.round(state._dist)+" m" : (state._dist/1000).toFixed(2)+" km";
    }
    
    // Salva ponto
    try { await appendRoutePoint(supabase, state.lastPos); } catch(e){ console.error(e); }
    
    if (state.routePoints.length === 1) setMapCenter(lat, lng, 18);

  }, err => console.error(err), CONFIG.GEO);
}

// --- Renderização de Listas ---

async function renderMeliponaries() {
  const list = await loadMeliponaries(supabase);
  const container = document.getElementById("colonies-list"); // Certifique que esse ID existe no HTML (View 1)
  if(!container) return;
  
  if (list.length === 0) {
    container.innerHTML = `<div class="card empty-state"><p>Nenhum meliponário encontrado.</p></div>`;
    return;
  }

  container.innerHTML = list.map(m => `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="font-size:1rem">${m.name}</strong>
        <div class="subtle" style="font-size:0.8rem">Criado em ${new Date(m.created_at).toLocaleDateString()}</div>
      </div>
      <button class="btn-xs">Ver</button>
    </div>
  `).join("");
}

async function renderTrails() {
  const trails = await loadMyTrails(supabase);
  ui.trailsList.innerHTML = trails.length ? trails.map(t => 
    `<div class="card" style="padding:10px; font-size:0.85rem; border-left: 3px solid #16a34a;">
       <strong>${t.name}</strong>
       <div style="display:flex; justify-content:space-between; color:#9ca3af; margin-top:4px;">
         <span>${new Date(t.created_at).toLocaleDateString()}</span>
         <span>${t.path ? t.path.length : 0} pts</span>
       </div>
     </div>`
  ).join("") : "";
  ui.trailsEmpty.classList.toggle("hidden", trails.length > 0);
}

async function renderNests() {
  const nests = await loadMyNests(supabase);
  // Filtra ou mostra todos na aba "Mata"
  ui.allNestsList.innerHTML = nests.length ? nests.map(n => `
    <div class="card" style="padding:12px;">
      <div style="display:flex; justify-content:space-between;">
         <span class="badge">${n.status}</span>
         <span class="subtle">${new Date(n.cataloged_at).toLocaleDateString()}</span>
      </div>
      <div style="margin-top:6px; font-weight:bold;">${n.species || "Espécie n/d"}</div>
      <div class="subtle">${n.note || "Sem obs."}</div>
      ${n.photo_url ? `<div style="margin-top:8px; font-size:0.8rem; color:#4ade80;">📷 Foto anexa</div>` : ""}
    </div>
  `).join("") : "";
  ui.nestsEmpty.classList.toggle("hidden", nests.length > 0);
}

// --- Event Listeners ---

// Abas
ui.navItems.forEach(btn => {
  btn.addEventListener("click", async () => {
    const target = btn.dataset.target;
    switchTab(target);
    
    // Lazy Load das abas
    if (target === 'view-traps') {
      setTimeout(() => state.map && state.map.invalidateSize(), 100);
      await renderTrails();
    }
    if (target === 'view-meliponaries') {
      await renderMeliponaries();
    }
    if (target === 'view-natural') {
      await renderNests();
    }
    if (target === 'view-profile') {
      // Carrega dados do perfil
      const profile = await loadProfile();
      if(profile && profile.user_type) {
        document.querySelector("#p_email").innerHTML += `<br><small>${profile.user_type}</small>`;
      }
    }
  });
});

// Botões Trilha
ui.btnStartRoute.addEventListener("click", async () => {
  try {
    const route = await createRoute(supabase);
    toast(ui.routeHint, "Trilha iniciada!", "ok");
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    resetMapOverlays();
    state._dist = 0;
    startWatchingGPS();
  } catch(e) { toast(ui.routeHint, e.message, "error"); }
});

ui.btnFinishRoute.addEventListener("click", async () => {
  navigator.geolocation.clearWatch(state.watchId);
  await finishRoute(supabase);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  await renderTrails();
});

// Modal Ninho
ui.btnMarkNest.addEventListener("click", () => {
  if (!state.currentRoute) return toast(ui.routeHint, "Inicie uma trilha primeiro.", "error");
  openNestModal();
});
ui.nestCancel.addEventListener("click", closeNestModal);
ui.photoModalClose?.addEventListener("click", () => document.getElementById("photo-modal").classList.add("hidden"));

ui.btnConfirmNest.addEventListener("click", async () => {
  try {
    ui.btnConfirmNest.textContent = "Salvando...";
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
    addNestMarker(state.lastPos.lat, state.lastPos.lng);
    ui.nestsCountText.textContent = parseInt(ui.nestsCountText.textContent) + 1;
    closeNestModal();
    toast(ui.routeHint, "Ninho salvo!", "ok");
  } catch(e) {
    alert("Erro: " + e.message);
  } finally {
    ui.btnConfirmNest.textContent = "Salvar";
  }
});

// Logout
ui.btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// --- Boot ---
bindAuth(supabase, async () => {
  ui.screenLogin.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
  
  if(state.user) {
    ui.p_email.textContent = state.user.email;
  }
  
  initMap(); 
  
  // Inicia na aba Meliponários (Dashboard)
  switchTab("view-meliponaries"); 
  await renderMeliponaries();
});
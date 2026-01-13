import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, openNestModal, closeNestModal } from "./ui.js";
import { CONFIG } from "./config.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addNestMarker, resetMapOverlays } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "../js/nests.js"; 
// REMOVIDO O IMPORT QUE ESTAVA DANDO ERRO:
// import { loadMeliponaries } from "./meliponario.js"; 
import { loadProfile } from "./profile.js";

const supabase = getSupabase();

// ======================================================
// CÓDIGO DO MELIPONARIO (INCORPORADO PARA CORRIGIR ERRO 404)
// ======================================================

/**
 * Carrega a lista de meliponários do usuário
 */
async function loadMeliponaries(supabaseClient) {
  if (!state.user) return [];

  const { data, error } = await supabaseClient
    .from("meliponaries") 
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar meliponários:", error.message);
    return [];
  }
  return data;
}

/**
 * Cria um novo meliponário
 */
async function createMeliponary(supabaseClient, name) {
  if (!state.user) throw new Error("Você precisa estar logado.");
  
  const { data, error } = await supabaseClient
    .from("meliponaries")
    .insert({
      user_id: state.user.id,
      name: name
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ======================================================
// FIM DO CÓDIGO INCORPORADO
// ======================================================

// --- LÓGICA DE GPS (Haversine) ---
function metersBetween(a, b) {
  const R = 6371000; 
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1-s1));
}

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
    
    // Salva ponto no banco
    try { await appendRoutePoint(supabase, state.lastPos); } catch(e){ console.error(e); }
    
    // Centraliza mapa (apenas no começo para não atrapalhar navegação manual)
    if (state.routePoints.length === 1) setMapCenter(lat, lng, 18);

  }, err => console.error(err), CONFIG.GEO);
}

// --- RENDERIZADORES DE LISTAS ---

// 1. Renderiza Capturados (Cálculo 35 dias)
async function renderCaptured() {
  const nests = await loadMyNests(supabase);
  const captured = nests.filter(n => n.status === "CAPTURADO");

  if (captured.length === 0) {
    ui.capturedList.innerHTML = "";
    ui.capturedEmpty.classList.remove("hidden");
    return;
  }
  ui.capturedEmpty.classList.add("hidden");

  ui.capturedList.innerHTML = captured.map(n => {
    const captureDate = new Date(n.captured_at || n.created_at);
    const today = new Date();
    const diffTime = Math.abs(today - captureDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const daysLeft = 35 - diffDays;

    let alertHtml = "";
    if (daysLeft <= 0) {
      alertHtml = `<span class="status-alert" style="color:#ef4444">⚠ Passou do prazo! Retirar já.</span>`;
    } else if (daysLeft <= 5) {
      alertHtml = `<span class="status-alert">⚠ Faltam ${daysLeft} dias para retirar.</span>`;
    } else {
      alertHtml = `<span class="status-ok">✔ Aguardando maturação (${daysLeft} dias restantes).</span>`;
    }

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between">
          <strong>${n.species || "Espécie não ident."}</strong>
          <span class="subtle">${captureDate.toLocaleDateString()}</span>
        </div>
        ${alertHtml}
        <div class="subtle" style="margin-top:6px">${n.note || ""}</div>
      </div>
    `;
  }).join("");
}

// 2. Renderiza Meliponários
async function renderMeliponaries() {
  const list = await loadMeliponaries(supabase); // Agora chama a função interna
  const container = document.getElementById("colonies-list");
  if(!container) return;
  
  container.innerHTML = list.length ? list.map(m => 
    `<div class="card">
       <strong>${m.name}</strong>
       <div class="subtle">Criado em ${new Date(m.created_at).toLocaleDateString()}</div>
     </div>`
  ).join("") : `<div class="card empty-state"><p>Nenhum meliponário encontrado.</p></div>`;
}

// 3. Renderiza Histórico de Trilhas
async function renderTrails() {
  const trails = await loadMyTrails(supabase);
  ui.trailsList.innerHTML = trails.map(t => 
    `<div class="card" style="padding:10px; font-size:0.85rem; border-left: 3px solid #16a34a;">
       <strong>${t.name}</strong>
       <div style="display:flex; justify-content:space-between; color:#9ca3af; margin-top:4px;">
         <span>${new Date(t.created_at).toLocaleDateString()}</span>
         <span>${t.path ? t.path.length : 0} pts</span>
       </div>
     </div>`
  ).join("");
  ui.trailsEmpty.classList.toggle("hidden", trails.length > 0);
}

// 4. Renderiza Ninhos da Mata (Aba 3)
async function renderNaturalNests() {
  const nests = await loadMyNests(supabase);
  // Aqui poderia filtrar onde status != 'DEPOSITADO' ou criar lógica específica
  // Por enquanto mostra todos para visualização
  const container = document.getElementById("allNestsList");
  if(!container) return;
  
  container.innerHTML = nests.length ? nests.map(n => `
    <div class="card" style="padding:12px;">
      <div style="display:flex; justify-content:space-between;">
         <span class="badge">${n.status}</span>
         <span class="subtle">${new Date(n.cataloged_at).toLocaleDateString()}</span>
      </div>
      <div style="margin-top:6px; font-weight:bold;">${n.species || "Espécie n/d"}</div>
      ${n.photo_url ? `<div style="margin-top:8px; font-size:0.8rem; color:#4ade80;">📷 Foto anexa</div>` : ""}
    </div>
  `).join("") : "";
}

// --- EVENTOS DE INTERFACE ---

// Clique nas Abas Principais (Rodapé)
ui.navItems.forEach(btn => {
  btn.addEventListener("click", async () => {
    const target = btn.dataset.target;
    switchTab(target);
    
    // Lazy Load das abas
    if (target === 'view-traps') {
       setTimeout(() => state.map && state.map.invalidateSize(), 100);
       switchSubTab("sub-deposit"); // Abre submenu padrão
    }
    
    if (target === 'view-meliponaries') {
       await renderMeliponaries();
    }
    
    if (target === 'view-natural') {
       await renderNaturalNests();
    }
    
    if (target === 'view-profile') {
      // 1. Dados do Usuário
      const user = state.user;
      if (user) {
        const emailDisplay = document.getElementById("p_email_display");
        const initials = document.getElementById("p_initials");
        const idShort = document.getElementById("p_id_short");
        
        if(emailDisplay) emailDisplay.textContent = user.email;
        if(initials) initials.textContent = user.email.charAt(0).toUpperCase();
        if(idShort) idShort.textContent = user.id.slice(0, 8) + "...";
      }

      // 2. Estatísticas (Carrega tudo para contar)
      // Nota: Idealmente o Supabase daria um .count(), mas array length serve para protótipo
      const meliponaries = await loadMeliponaries(supabase);
      const trails = await loadMyTrails(supabase);
      const nests = await loadMyNests(supabase);

      const statMeliponaries = document.getElementById("stat_meliponaries");
      const statTrails = document.getElementById("stat_trails");
      const statNests = document.getElementById("stat_nests");

      if(statMeliponaries) statMeliponaries.textContent = meliponaries.length;
      if(statTrails) statTrails.textContent = trails.length;
      if(statNests) statNests.textContent = nests.length;

      // 3. Configura Botão Sair
      const btnLogoutAction = document.getElementById("btnLogoutAction");
      if(btnLogoutAction) {
        btnLogoutAction.onclick = async () => {
          if(confirm("Deseja realmente sair?")) {
             await supabase.auth.signOut();
             window.location.reload();
          }
        };
      }
    }
  });
});

// Clique nos Submenus (Topo Iscas)
ui.subBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const sub = btn.dataset.sub;
    switchSubTab(sub);
    
    if (sub === "sub-deposit") setTimeout(() => state.map && state.map.invalidateSize(), 100);
    if (sub === "sub-trails") await renderTrails();
    if (sub === "sub-captured") await renderCaptured();
  });
});

// Botões da Trilha (Gravação)
ui.btnStartRoute.addEventListener("click", async () => {
  try {
    const route = await createRoute(supabase);
    toast(ui.routeHint, "Trilha iniciada!", "ok");
    
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    
    startWatchingGPS();
  } catch(e) { 
    toast(ui.routeHint, e.message, "error"); 
  }
});

ui.btnFinishRoute.addEventListener("click", async () => {
  navigator.geolocation.clearWatch(state.watchId);
  await finishRoute(supabase);
  
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  
  // Se estiver vendo a lista de trilhas, atualiza
  await renderTrails();
});

// Modal Ninho (Salvar)
ui.btnMarkNest.addEventListener("click", openNestModal);
ui.nestCancel.addEventListener("click", closeNestModal);

ui.btnConfirmNest.addEventListener("click", async () => {
  ui.btnConfirmNest.textContent = "Salvando...";
  try {
    const file = ui.nestPhoto.files[0];
    await createNest(supabase, {
      note: ui.nestNote.value,
      status: ui.nestStatus.value,
      species: ui.nestSpecies.value,
      lat: state.lastPos?.lat || 0,
      lng: state.lastPos?.lng || 0,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    
    closeNestModal();
    toast(ui.routeHint, "Isca/Ninho registrado!", "ok");
    
    // Atualiza contadores visuais
    ui.nestsCountText.textContent = parseInt(ui.nestsCountText.textContent) + 1;
    
  } catch(e) {
    alert("Erro: " + e.message);
  } finally {
    ui.btnConfirmNest.textContent = "Salvar";
  }
});

// --- INICIALIZAÇÃO (BOOT) ---
bindAuth(supabase, async () => {
  ui.screenLogin.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
  
  initMap();
  
  // Abre direto na aba "Iscas" (View Traps) para facilitar o uso em campo
  switchTab("view-traps"); 
  switchSubTab("sub-deposit");
});
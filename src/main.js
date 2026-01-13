import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, openNestModal, closeNestModal } from "./ui.js";
import { CONFIG } from "./config.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addNestMarker, resetMapOverlays } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js"; 
import { loadMeliponaries } from "./meliponario.js";
import { loadProfile } from "./profile.js";

const supabase = getSupabase();

// ... (Funções de GPS e Watcher mantidas iguais) ...
function metersBetween(a, b) { /* ... código anterior ... */ return 0; } // simplificado pro exemplo
function startWatchingGPS() { /* ... código anterior ... */ }

// --- RENDERIZADORES ---

// 1. Renderiza a lista de "Capturados" com a lógica de 35 dias
async function renderCaptured() {
  const nests = await loadMyNests(supabase);
  // Filtra apenas os que têm status CAPTURADO
  const captured = nests.filter(n => n.status === "CAPTURADO");

  if (captured.length === 0) {
    ui.capturedList.innerHTML = "";
    ui.capturedEmpty.classList.remove("hidden");
    return;
  }
  ui.capturedEmpty.classList.add("hidden");

  ui.capturedList.innerHTML = captured.map(n => {
    // Cálculo dos dias
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

// 2. Renderiza Meliponários (Aba 1)
async function renderMeliponaries() {
  const list = await loadMeliponaries(supabase);
  const container = document.getElementById("colonies-list");
  if(!container) return;
  container.innerHTML = list.length ? list.map(m => 
    `<div class="card"><strong>${m.name}</strong></div>`
  ).join("") : `<div class="card empty-state">Sem meliponários.</div>`;
}

// 3. Renderiza Histórico de Trilhas (Submenu 2)
async function renderTrails() {
  const trails = await loadMyTrails(supabase);
  ui.trailsList.innerHTML = trails.map(t => 
    `<div class="card"><strong>${t.name}</strong><br><span class="subtle">${new Date(t.created_at).toLocaleDateString()}</span></div>`
  ).join("");
  ui.trailsEmpty.classList.toggle("hidden", trails.length > 0);
}

// --- EVENTOS DE INTERFACE ---

// Clique nas Abas Principais (Rodapé)
ui.navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    switchTab(target);
    if(target === 'view-traps') {
       setTimeout(() => state.map && state.map.invalidateSize(), 100);
       // Abre por padrão o submenu "Depositar"
       switchSubTab("sub-deposit");
    }
    if(target === 'view-meliponaries') renderMeliponaries();
  });
});

// Clique nos Submenus (Topo Iscas)
ui.subBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const sub = btn.dataset.sub;
    switchSubTab(sub);
    
    if (sub === "sub-deposit") {
      setTimeout(() => state.map && state.map.invalidateSize(), 100);
    }
    if (sub === "sub-trails") await renderTrails();
    if (sub === "sub-captured") await renderCaptured();
  });
});

// Botões da Trilha (Gravação)
ui.btnStartRoute.addEventListener("click", async () => {
  try {
    const route = await createRoute(supabase);
    // ... (lógica de UI start)
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    startWatchingGPS();
  } catch(e) { alert(e.message); }
});

ui.btnFinishRoute.addEventListener("click", async () => {
  // ... (lógica de UI stop)
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  await finishRoute(supabase);
});

// Salvar Ninho (Modal)
ui.btnMarkNest.addEventListener("click", openNestModal);
ui.nestCancel.addEventListener("click", closeNestModal);

ui.btnConfirmNest.addEventListener("click", async () => {
  ui.btnConfirmNest.textContent = "Salvando...";
  try {
    const file = ui.nestPhoto.files[0];
    await createNest(supabase, {
      note: ui.nestNote.value,
      status: ui.nestStatus.value, // Aqui pega DEPOSITADO, CAPTURADO, etc.
      species: ui.nestSpecies.value,
      lat: state.lastPos?.lat || 0,
      lng: state.lastPos?.lng || 0,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    // Se marcou como capturado, já define a data de captura
    // (A função createNest no nests.js já deve tratar captured_at se status==CAPTURADO)
    
    closeNestModal();
    alert("Isca registrada!");
  } catch(e) {
    alert("Erro: " + e.message);
  } finally {
    ui.btnConfirmNest.textContent = "Salvar";
  }
});

// Boot
bindAuth(supabase, async () => {
  ui.screenLogin.classList.add("hidden");
  ui.screenApp.classList.remove("hidden");
  initMap();
  switchTab("view-traps"); // Abre direto em Iscas para testar
  switchSubTab("sub-deposit");
});
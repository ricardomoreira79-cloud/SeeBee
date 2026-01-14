// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, switchSubTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- RENDERIZADORES ---

async function renderCaptured() {
  const nests = await loadMyNests(supabase);
  const captured = nests.filter(n => n.status === "CAPTURADO");

  if (!captured.length) {
    ui.capturedList.innerHTML = "<p class='subtle'>Nenhuma isca capturada.</p>";
    return;
  }

  ui.capturedList.innerHTML = captured.map(n => {
    const dataCaptura = new Date(n.captured_at);
    const hoje = new Date();
    const diasPassados = Math.floor((hoje - dataCaptura) / (1000 * 60 * 60 * 24));
    const faltam = 35 - diasPassados;

    let classeStatus = faltam <= 0 ? "status-alert" : "status-ok";
    let msg = faltam <= 0 ? "Pronto para retirar!" : `Faltam ${faltam} dias`;

    return `
      <div class="card">
        <strong>${n.species || "Espécie não informada"}</strong>
        <div class="${classeStatus}" style="font-weight:bold; margin: 5px 0;">${msg}</div>
        <div class="subtle">Capturado em: ${dataCaptura.toLocaleDateString()}</div>
      </div>
    `;
  }).join("");
}

async function renderMeliponaries() {
  const { data } = await supabase.from("meliponaries").select("*").eq("user_id", state.user.id);
  const container = document.getElementById("colonies-list");
  if (!container) return;
  container.innerHTML = data?.length ? data.map(m => `
    <div class="card">
      <strong>🏠 ${m.name}</strong>
      <div class="subtle">Local: ${m.location || "Não informado"}</div>
    </div>
  `).join("") : "<p class='subtle'>Nenhum meliponário cadastrado.</p>";
}

async function refreshDashboard() {
  await loadMyTrails(supabase);
  await loadMyNests(supabase);
  // Atualiza contadores no perfil ou resumo
  if (ui.nestsCountText) ui.nestsCountText.textContent = state.allNests.length;
}

// --- EVENTOS ---

ui.navItems.forEach(btn => {
  btn.addEventListener("click", async () => {
    const target = btn.dataset.target;
    switchTab(target);
    if (target === "view-meliponaries") await renderMeliponaries();
    if (target === "view-traps") {
        await refreshDashboard();
        setTimeout(() => state.map?.invalidateSize(), 200);
    }
  });
});

ui.subBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const sub = btn.dataset.sub;
    switchSubTab(sub);
    if (sub === "sub-captured") await renderCaptured();
    if (sub === "sub-trails") await refreshDashboard();
  });
});

ui.btnStartRoute?.addEventListener("click", async () => {
  try {
    await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    
    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
      state.lastPos = p;
      addRoutePoint(p.lat, p.lng);
      setMapCenter(p.lat, p.lng); // Segue o usuário
      if (state.currentRoute) await appendRoutePoint(supabase, p);
    }, null, { enableHighAccuracy: true });
    
    toast(ui.routeHint, "Trilha iniciada!");
  } catch (e) { alert(e.message); }
});

ui.btnFinishRoute?.addEventListener("click", async () => {
  navigator.geolocation.clearWatch(state.watchId);
  await finishRoute(supabase);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
  await refreshDashboard();
});

ui.btnConfirmNest?.addEventListener("click", async () => {
  ui.btnConfirmNest.disabled = true;
  try {
    const file = ui.nestPhoto.files[0];
    await createNest(supabase, {
      note: ui.nestNote.value,
      status: ui.nestStatus.value,
      species: ui.nestSpecies.value,
      lat: state.lastPos?.lat,
      lng: state.lastPos?.lng,
      route_id: state.currentRoute?.id,
      photoFile: file
    });
    closeNestModal();
    toast(ui.routeHint, "Ninho registrado com sucesso!");
    await refreshDashboard();
  } catch (e) { alert("Erro ao salvar: " + e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
});

// --- INICIALIZAÇÃO ---
bindAuth(supabase, async () => {
  initMap();
  switchTab("view-traps");
  await refreshDashboard();
});
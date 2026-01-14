// js/main.js
import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMap } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- CONTROLE DE UI E TEMAS ---
function setupUI() {
  document.getElementById("btnToggleTheme").onclick = () => {
    const isDark = document.body.classList.toggle("dark-theme");
    document.body.classList.toggle("light-theme", !isDark);
  };

  ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
  ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");

  document.querySelectorAll(".menu-item").forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      if (target) {
        switchTab(target);
        ui.sideMenu.classList.remove("open");
        if (target === "view-captures") renderCaptures();
      }
    };
  });

  ui.btnLogout.onclick = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // PF/PJ e Meliponicultor
  ui.userRole.onchange = (e) => ui.meliponicultorFields.classList.toggle("hidden", e.target.value !== "meliponicultor");
  ui.personType.onchange = (e) => ui.cnpjField.classList.toggle("hidden", e.target.value !== "PJ");

  // Offline/Online
  const updateOffline = () => {
    const isOff = !navigator.onLine;
    ui.statusPill.classList.toggle("offline", isOff);
    ui.onlineDot.classList.toggle("offline", isOff);
    ui.onlineText.textContent = isOff ? "Offline" : "Online";
  };
  window.addEventListener("online", updateOffline);
  window.addEventListener("offline", updateOffline);
  updateOffline();
}

// --- GPS E TRILHA ---
ui.btnStartRoute.onclick = async () => {
  try {
    await createRoute(supabase);
    ui.btnStartRoute.classList.add("hidden");
    ui.btnFinishRoute.classList.remove("hidden");
    ui.btnMarkNest.disabled = false;
    clearMap();
    state.nestsInRoute = 0;

    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: new Date().toISOString() };
      state.lastPos = p;
      
      if (state.routePoints.length === 0) {
        addMarker(p.lat, p.lng, "green", "Início");
        setMapCenter(p.lat, p.lng, 18);
      }
      state.routePoints.push(p);
      addRoutePoint(p.lat, p.lng);
      if (state.currentRoute) await appendRoutePoint(supabase, p);
    }, (err) => console.error(err), { enableHighAccuracy: true });

    toast(ui.routeHint, "Gravando trilha...");
  } catch (e) { alert(e.message); }
};

ui.btnFinishRoute.onclick = async () => {
  const name = prompt("Nome desta trilha:", `Trilha ${new Date().toLocaleDateString()}`);
  navigator.geolocation.clearWatch(state.watchId);
  if (state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "red", "Fim");
  await finishRoute(supabase, name);
  ui.btnStartRoute.classList.remove("hidden");
  ui.btnFinishRoute.classList.add("hidden");
  ui.btnMarkNest.disabled = true;
};

ui.btnMarkNest.onclick = () => ui.modalNest.style.display = "flex";

ui.btnConfirmNest.onclick = async () => {
  if (!state.lastPos) return alert("Sinal GPS pendente...");
  ui.btnConfirmNest.disabled = true;
  try {
    await createNest(supabase, {
      note: ui.nestNote.value,
      lat: state.lastPos.lat,
      lng: state.lastPos.lng,
      route_id: state.currentRoute.id,
      photoFile: ui.nestPhoto.files[0]
    });
    state.nestsInRoute++;
    ui.nestsCountText.textContent = `${state.nestsInRoute} ninhos marcados`;
    addMarker(state.lastPos.lat, state.lastPos.lng, "orange", `Ninho ${state.nestsInRoute}`);
    closeNestModal();
    toast(ui.routeHint, "Ninho registrado!");
  } catch (e) { alert(e.message); }
  finally { ui.btnConfirmNest.disabled = false; }
};

// --- RENDERIZADOR 35 DIAS ---
async function renderCaptures() {
  const nests = await loadMyNests(supabase);
  const container = document.getElementById("capturedList");
  const captured = nests.filter(n => n.status === "CAPTURADO");

  container.innerHTML = captured.map(n => {
    const dCap = new Date(n.captured_at);
    const dias = Math.floor((new Date() - dCap) / (1000 * 60 * 60 * 24));
    const faltam = 35 - dias;
    const classeAlert = faltam <= 0 ? "badge-alert" : "";

    return `
      <div class="card-maturacao">
        <div style="display:flex; justify-content:space-between; align-items:start">
          <div>
            <strong>${n.species || 'Espécie ID Pendente'}</strong>
            <div style="font-size:12px; color:var(--text-soft)">Capturado em: ${dCap.toLocaleDateString()}</div>
          </div>
          <span class="${classeAlert}">${faltam <= 0 ? "⚠️ RETIRAR" : "Faltam " + faltam + " dias"}</span>
        </div>
        ${n.photo_url ? `<img src="${n.photo_url}" style="width:100%; border-radius:12px; margin-top:10px">` : ""}
      </div>
    `;
  }).join("");
}

// --- BOOT ---
bindAuth(supabase, async () => {
  setupUI();
  initMap();
});
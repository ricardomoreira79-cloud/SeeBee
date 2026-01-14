import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { ui, toast, switchTab, closeNestModal } from "./ui.js";
import { bindAuth } from "./auth.js";
import { initMap, setMapCenter, addRoutePoint, addMarker, clearMap } from "./map.js";
import { createRoute, appendRoutePoint, finishRoute, loadMyTrails } from "./routes.js";
import { createNest, loadMyNests } from "./nests.js";

const supabase = getSupabase();

// --- SISTEMA DE TEMA E OFFLINE ---
function initAppListeners() {
    // Modo Light/Dark
    document.getElementById("btnToggleTheme").onclick = () => {
        const isDark = document.body.classList.toggle("dark-theme");
        document.body.classList.toggle("light-theme", !isDark);
    };

    // Detecção Online/Offline em Tempo Real
    const updateStatus = () => {
        const isOnline = navigator.onLine;
        ui.onlineDot.className = isOnline ? "status-dot" : "status-dot offline";
        ui.onlineText.textContent = isOnline ? "Online" : "Offline";
        ui.statusPill.style.borderColor = isOnline ? "#22c55e" : "#ef4444";
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();

    // Menu lateral
    ui.openMenu.onclick = () => ui.sideMenu.classList.add("open");
    ui.closeMenu.onclick = () => ui.sideMenu.classList.remove("open");
    
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", () => {
            const target = item.dataset.target;
            if(target) {
                switchTab(target);
                ui.sideMenu.classList.remove("open");
                if(target === "view-captures") renderCaptures();
            }
        });
    });

    // Logoff
    ui.btnLogout.onclick = async () => {
        if(confirm("Deseja sair da conta?")) {
            await supabase.auth.signOut();
            window.location.reload();
        }
    };

    // Perfil PF/PJ
    ui.userRole.onchange = (e) => ui.meliponicultorFields.classList.toggle("hidden", e.target.value !== "meliponicultor");
    ui.personType.onchange = (e) => ui.cnpjField.classList.toggle("hidden", e.target.value !== "PJ");
}

// --- LOGICA DE TRILHA E GPS ---
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
            
            // Zoom aproximado 18 no início
            if (state.routePoints.length === 0) {
                addMarker(p.lat, p.lng, "green", "Início");
                setMapCenter(p.lat, p.lng, 18);
            }

            state.routePoints.push(p);
            addRoutePoint(p.lat, p.lng);
            if (state.currentRoute) await appendRoutePoint(supabase, p);
        }, null, { enableHighAccuracy: true });

        toast(ui.routeHint, "Trilha iniciada com sucesso!");
    } catch (e) { alert(e.message); }
};

ui.btnFinishRoute.onclick = async () => {
    const defaultName = `Trilha ${new Date().toLocaleDateString()}`;
    const customName = prompt("Nome personalizado para esta trilha:", defaultName);
    
    navigator.geolocation.clearWatch(state.watchId);
    if(state.lastPos) addMarker(state.lastPos.lat, state.lastPos.lng, "red", "Fim");

    await finishRoute(supabase, customName || defaultName);
    ui.btnStartRoute.classList.remove("hidden");
    ui.btnFinishRoute.classList.add("hidden");
    ui.btnMarkNest.disabled = true;
    loadTrailsSummary();
};

ui.btnMarkNest.onclick = () => ui.modalNest.style.display = "flex";

ui.btnConfirmNest.onclick = async () => {
    if(!state.lastPos) return alert("Aguardando sinal GPS...");
    ui.btnConfirmNest.disabled = true;
    ui.btnConfirmNest.textContent = "Salvando...";
    
    try {
        await createNest(supabase, {
            note: ui.nestNote.value,
            lat: state.lastPos.lat,
            lng: state.lastPos.lng,
            route_id: state.currentRoute.id,
            photoFile: ui.nestPhoto.files[0]
        });
        
        state.nestsInRoute++;
        ui.nestsCountText.textContent = state.nestsInRoute;
        addMarker(state.lastPos.lat, state.lastPos.lng, "orange", `Isca ${state.nestsInRoute}`);
        closeNestModal();
        toast(ui.routeHint, "Isca marcada com sucesso!");
    } catch (e) { alert(e.message); }
    finally { ui.btnConfirmNest.disabled = false; ui.btnConfirmNest.textContent = "Salvar Registro"; }
};

// --- RENDERIZADORES ---
async function renderCaptures() {
    const nests = await loadMyNests(supabase);
    const container = document.getElementById("capturedList");
    const captured = nests.filter(n => n.status === "CAPTURADO");

    if(!captured.length) return container.innerHTML = "<p class='subtle'>Nenhuma captura ativa.</p>";

    container.innerHTML = captured.map(n => {
        const dCap = new Date(n.captured_at);
        const dias = Math.floor((new Date() - dCap) / (1000 * 60 * 60 * 24));
        const faltam = 35 - dias;
        const color = faltam <= 0 ? "#ef4444" : "#22c55e";
        
        return `
            <div class="card card-capture">
                <img src="${n.photo_url || './img/no-photo.png'}" class="thumb-capture">
                <div class="capture-info">
                    <strong>${n.species || 'Espécie ID Pendente'}</strong>
                    <div style="color:${color}; font-weight:700;">
                        ${faltam <= 0 ? "⚠️ RETIRAR IMEDIATAMENTE" : "⏳ Faltam " + faltam + " dias"}
                    </div>
                    <small>Capturado em: ${dCap.toLocaleDateString()}</small>
                </div>
            </div>
        `;
    }).join("");
}

async function loadTrailsSummary() {
    const trails = await loadMyTrails(supabase);
    ui.trailsSummary.innerHTML = trails.slice(0, 3).map(t => `
        <div class="card-trail">
            <strong>${t.name}</strong>
            <small>${new Date(t.created_at).toLocaleString()}</small>
        </div>
    `).join("");
}

// --- BOOT ---
bindAuth(supabase, async () => {
    initAppListeners();
    initMap();
    loadTrailsSummary();
    if(state.user) {
        ui.menuEmailDisplay.textContent = state.user.email;
        ui.menuAvatarChar.textContent = state.user.email[0].toUpperCase();
    }
});
import { state } from "./state.js";
import { ui, setAuthMessage, updateOnlineStatusPill, initNestModalHandlers, initPhotoModalHandlers } from "./ui.js";
import { signUp, signIn, signInWithGoogle, logout, checkSessionAndRoute, onAuthChange, supabaseClient } from "./auth.js";
import { initMap } from "./map.js";
import { startRoute, stopRoute, handleAddNest, syncRoutes, renderRoutesList, registerNestActionHandlers } from "./routes.js";
import { persistLocalRoutes } from "./storage.js";

/* ===== LÓGICA DE EDIÇÃO/EXCLUSÃO ===== */

// Agora aceita 'newSpecies' como 5º argumento
async function handleNestUpdate(routeId, nestId, newStatus, newNotes, newSpecies) {
  if (!state.isOnline) {
    alert("Você precisa estar online para editar ninhos.");
    return;
  }

  const route = state.allRoutes.find((r) => r.id === routeId);
  if (!route) return;

  const nest = route.nests.find((n) => n.id === nestId);
  if (!nest) return;

  // Atualiza dados locais
  nest.status = newStatus;
  nest.description = newNotes;

  // Se for capturado, salva a espécie. Se voltar para catalogado, limpa.
  if (newStatus === "capturado") {
    nest.species = newSpecies || "Não identificada";
    if (!nest.captured_at) nest.captured_at = new Date().toISOString();
  } else {
    delete nest.species;
  }

  try {
    const { error } = await supabaseClient
      .from("routes")
      .update({ traps: route.nests })
      .eq("id", routeId);

    if (error) throw error;

    persistLocalRoutes(state.allRoutes);
    renderRoutesList();
    alert("Ninho atualizado com sucesso!");
  } catch (error) {
    console.error("Erro ao atualizar ninho:", error);
    alert("Erro ao salvar alterações.");
    await refreshData();
  }
}

async function handleNestDelete(routeId, nestId, reason) {
  if (!state.isOnline) {
    alert("Offline: não é possível excluir agora.");
    return;
  }

  const route = state.allRoutes.find((r) => r.id === routeId);
  if (!route) return;

  const nest = route.nests.find((n) => n.id === nestId);
  if (!nest) return;

  nest.status = "removido";
  nest.removed_at = new Date().toISOString();
  nest.removal_reason = reason;

  try {
    const { error } = await supabaseClient
      .from("routes")
      .update({ traps: route.nests })
      .eq("id", routeId);

    if (error) throw error;

    persistLocalRoutes(state.allRoutes);
    renderRoutesList();
    alert("Ninho removido.");
  } catch (error) {
    console.error("Erro ao remover:", error);
    alert("Erro ao remover.");
    await refreshData();
  }
}

function bindUI() {
  registerNestActionHandlers(handleNestUpdate, handleNestDelete);

  ui.btnSignUp.addEventListener("click", async () => {
    await signUp(ui.authEmail.value.trim(), ui.authPassword.value);
  });

  ui.btnSignIn.addEventListener("click", async () => {
    ui.btnSignIn.disabled = true;
    ui.btnSignIn.textContent = "Entrando...";
    try {
      await signIn(ui.authEmail.value.trim(), ui.authPassword.value);
    } finally {
      ui.btnSignIn.disabled = false;
      ui.btnSignIn.textContent = "Entrar";
    }
  });

  ui.btnGoogle.addEventListener("click", async () => {
    await signInWithGoogle();
  });

  ui.btnLogout.addEventListener("click", async () => {
    await logout();
  });

  ui.btnToggleRoute.addEventListener("click", async () => {
    if (!state.currentRoute) startRoute();
    else await stopRoute();
    renderRoutesList();
  });

  ui.btnAddNest.addEventListener("click", handleAddNest);

  // ✅ Corrige o crash do bootstrap:
  // No HTML o botão é id="btn-refresh-history", e no ui.js ele vira btnRefreshHistory.
  // Se ele existir, usamos ele. Se não existir, não quebra.
  const refreshBtn = ui.btnRefreshHistory || ui.btnRefresh;
  refreshBtn?.addEventListener("click", async () => {
    await refreshData();
  });
}

async function refreshData() {
  updateOnlineStatusPill();
  await syncRoutes();
  renderRoutesList();
}

async function initAppOnce() {
  if (state.appInitialized) return;
  state.appInitialized = true;

  initNestModalHandlers();
  initPhotoModalHandlers();
  initMap();

  await refreshData();

  window.addEventListener("online", async () => {
    updateOnlineStatusPill();
    await refreshData();
  });

  window.addEventListener("offline", () => {
    updateOnlineStatusPill();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => console.error("SW failed:", err));
    });
  }
}

async function bootstrap() {
  updateOnlineStatusPill();
  bindUI();

  const res = await checkSessionAndRoute();
  if (res.logged) await initAppOnce();

  onAuthChange(async () => {
    const r = await checkSessionAndRoute();
    if (r.logged) await initAppOnce();
  });

  if (!navigator.onLine) setAuthMessage("Sem internet.", true);
}

bootstrap();

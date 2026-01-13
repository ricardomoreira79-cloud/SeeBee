import { state } from "./state.js";
import { ui, setAuthMessage, updateOnlineStatusPill, initNestModalHandlers, initPhotoModalHandlers } from "./ui.js";
import { signUp, signIn, signInWithGoogle, logout, checkSessionAndRoute, onAuthChange } from "./auth.js";
import { initMap } from "./map.js";
import { startRoute, stopRoute, handleAddNest, syncRoutes, renderRoutesList } from "./routes.js";

function bindUI() {
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

  ui.btnRefresh.addEventListener("click", async () => {
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

  if (!navigator.onLine) {
    setAuthMessage("Sem internet agora. Você poderá entrar quando a conexão voltar.", true);
  }
}

bootstrap();

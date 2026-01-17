import { state } from "./state.js";
import { ui, setAuthMessage, updateOnlineStatusPill, initNestModalHandlers, initPhotoModalHandlers } from "./ui.js";
import { signUp, signIn, signInWithGoogle, logout, checkSessionAndRoute, onAuthChange, supabaseClient } from "./auth.js";
import { initMap } from "./map.js";
import { startRoute, stopRoute, handleAddNest, syncRoutes, renderRoutesList, registerNestActionHandlers, saveRoute } from "./routes.js";
import { persistLocalRoutes } from "./storage.js";

/* ===== LÓGICA DE EDIÇÃO/EXCLUSÃO DE NINHOS ===== */

// Função chamada quando clica em "Salvar Alterações" no modal da foto
async function handleNestUpdate(routeId, nestId, newStatus, newNotes) {
    if (!state.isOnline) {
        alert("Você precisa estar online para editar ninhos.");
        return;
    }

    // 1. Achar a rota e o ninho localmente
    const route = state.allRoutes.find(r => r.id === routeId);
    if (!route) return;
    const nest = route.nests.find(n => n.id === nestId);
    if (!nest) return;

    // 2. Atualizar dados locais
    nest.status = newStatus;
    nest.description = newNotes;

    // Se virou capturado, marca a data
    if (newStatus === 'capturado' && !nest.captured_at) {
        nest.captured_at = new Date().toISOString();
    }

    // 3. Salvar no banco (atualiza a rota inteira com o array de ninhos modificado)
    try {
        const { error } = await supabaseClient
            .from('routes')
            .update({ traps: route.nests }) // 'nests' local vira 'traps' no banco
            .eq('id', routeId);

        if (error) throw error;

        // 4. Persistir localmente e atualizar UI
        persistLocalRoutes(state.allRoutes);
        renderRoutesList();
        alert("Ninho atualizado com sucesso!");

    } catch (error) {
        console.error("Erro ao atualizar ninho:", error);
        alert("Erro ao salvar alterações. Tente novamente.");
        // Recarrega dados para desfazer alteração local em caso de erro
        await refreshData();
    }
}

// Função chamada quando confirma a exclusão na lixeira
async function handleNestDelete(routeId, nestId, reason) {
    if (!state.isOnline) {
        alert("Você precisa estar online para excluir ninhos.");
        return;
    }

    const route = state.allRoutes.find(r => r.id === routeId);
    if (!route) return;
    const nest = route.nests.find(n => n.id === nestId);
    if (!nest) return;

    // "Excluir" na verdade é mudar o status para 'removido'
    nest.status = 'removido';
    nest.removed_at = new Date().toISOString();
    nest.removal_reason = reason;

    try {
        const { error } = await supabaseClient
            .from('routes')
            .update({ traps: route.nests })
            .eq('id', routeId);

        if (error) throw error;

        persistLocalRoutes(state.allRoutes);
        renderRoutesList();
        alert("Ninho marcado como removido.");

    } catch (error) {
        console.error("Erro ao remover ninho:", error);
        alert("Erro ao processar remoção.");
        await refreshData();
    }
}


/* ===== INICIALIZAÇÃO DO APP ===== */

function bindUI() {
  // Registra as funções de ação no módulo de rotas
  registerNestActionHandlers(handleNestUpdate, handleNestDelete);

  ui.btnSignUp.addEventListener("click", async () => {
    await signUp(ui.authEmail.value.trim(), ui.authPassword.value);
  });

  ui.btnSignIn.addEventListener("click", async () => {
    ui.btnSignIn.disabled = true; ui.btnSignIn.textContent = "Entrando...";
    try { await signIn(ui.authEmail.value.trim(), ui.authPassword.value); } 
    finally { ui.btnSignIn.disabled = false; ui.btnSignIn.textContent = "Entrar"; }
  });

  ui.btnGoogle.addEventListener("click", async () => { await signInWithGoogle(); });
  ui.btnLogout.addEventListener("click", async () => { await logout(); });

  ui.btnToggleRoute.addEventListener("click", async () => {
    if (!state.currentRoute) startRoute();
    else await stopRoute();
    renderRoutesList();
  });

  ui.btnAddNest.addEventListener("click", handleAddNest);
  
  ui.btnRefreshHistory?.addEventListener("click", async () => {
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
  initPhotoModalHandlers(); // Inicializa os handlers do novo modal
  initMap();

  await refreshData();

  window.addEventListener("online", async () => { updateOnlineStatusPill(); await refreshData(); });
  window.addEventListener("offline", () => { updateOnlineStatusPill(); });

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
    setAuthMessage("Sem internet. Você poderá entrar quando a conexão voltar.", true);
  }
}

bootstrap();
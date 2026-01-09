import { state } from "./state.js";

import { renderAuthScreen, renderAppShell } from "./ui/templates.js";
import { renderDrawer, openDrawer, closeDrawer } from "./ui/drawer.js";
import { renderNestModal, openNestModal } from "./ui/nestModal.js";
import { renderPhotoModal, bindPhotoModal } from "./ui/photoModal.js";
import { renderRoutesList } from "./ui/routesList.js";
import { toast } from "./ui/toast.js";

import { initNetworkListeners } from "./services/networkService.js";
import { getSession, signIn, signUp, signInWithGoogle, signOut, onAuthChange } from "./services/authService.js";

import { initMap } from "./features/mapController.js";
import { drawRoute } from "./features/mapController.js";
import { startRoute, stopRoute } from "./features/trackerController.js";

import { syncRoutes, saveRoute, loadLocalIntoState, persistStateRoutes } from "./services/routesService.js";
import { idbPutPhoto } from "./services/idbService.js";
import { supabaseClient } from "./services/supabaseClient.js";

const root = document.getElementById("app-root");

function setOnlineUI() {
  const pill = document.getElementById("status-pill");
  const txt = document.getElementById("net-text");
  if (!pill || !txt) return;

  if (state.isOnline) {
    pill.classList.remove("offline");
    txt.textContent = "Trabalhando online";
  } else {
    pill.classList.add("offline");
    txt.textContent = "Trabalhando offline — dados só neste aparelho";
  }
}

function setAuthMsg(msg, isError = false) {
  const el = document.getElementById("auth-msg");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "#fecaca" : "var(--muted)";
}

async function showAuth() {
  root.innerHTML = renderAuthScreen();

  const btnSignin = document.getElementById("btn-signin");
  const btnSignup = document.getElementById("btn-signup");
  const btnGoogle = document.getElementById("btn-google");

  btnSignin.onclick = async () => {
    try {
      setAuthMsg("Entrando…");
      const email = document.getElementById("auth-email").value.trim();
      const pass = document.getElementById("auth-password").value;

      if (!email || !pass) return setAuthMsg("Preencha e-mail e senha.", true);

      const { error } = await signIn(email, pass);
      if (error) return setAuthMsg(error.message, true);

      setAuthMsg("");
      await boot();
    } catch {
      setAuthMsg("Falha ao entrar. Verifique internet.", true);
    }
  };

  btnSignup.onclick = async () => {
    try {
      setAuthMsg("Criando conta…");
      const email = document.getElementById("auth-email").value.trim();
      const pass = document.getElementById("auth-password").value;
      if (!email || !pass) return setAuthMsg("Preencha e-mail e senha.", true);

      const { error } = await signUp(email, pass);
      if (error) return setAuthMsg(error.message, true);

      setAuthMsg("Conta criada. Agora clique em Entrar.");
    } catch {
      setAuthMsg("Falha ao criar conta.", true);
    }
  };

  btnGoogle.onclick = async () => {
    try {
      setAuthMsg("");
      await signInWithGoogle();
      // fluxo OAuth: redireciona fora do app
    } catch {
      setAuthMsg("Não foi possível iniciar login com Google.", true);
    }
  };
}

async function showApp() {
  root.innerHTML = renderAppShell();

  // Drawer + modals
  const email = state.user?.email || "";
  document.getElementById("drawer-root").innerHTML = renderDrawer(email);
  document.getElementById("nest-modal-root").innerHTML = renderNestModal();
  document.getElementById("photo-modal-root").innerHTML = renderPhotoModal();
  bindPhotoModal();

  // Drawer handlers
  document.getElementById("btn-open-drawer").onclick = () => openDrawer();
  document.getElementById("btn-close-drawer").onclick = () => closeDrawer();
  document.getElementById("drawer-backdrop").onclick = (e) => {
    if (e.target.id === "drawer-backdrop") closeDrawer();
  };

  document.getElementById("menu-logout").onclick = async () => {
    closeDrawer();
    await signOut();
    await showAuth();
  };

  // placeholders menu
  document.getElementById("menu-profile").onclick = () => toast("Perfil: próximo módulo");
  document.getElementById("menu-colonies").onclick = () => toast("Colônias: próximo módulo");
  document.getElementById("menu-tracker").onclick = () => closeDrawer();

  // Map init
  initMap();

  // Network status
  setOnlineUI();

  // Sync initial
  loadLocalIntoState();
  await safeSync();

  // UI controls
  const btnToggle = document.getElementById("btn-toggle-route");
  const btnAddNest = document.getElementById("btn-add-nest");
  const badge = document.getElementById("badge-status");
  const tIcon = document.getElementById("btn-toggle-icon");
  const tText = document.getElementById("btn-toggle-text");

  btnToggle.onclick = async () => {
    if (!state.currentRoute) {
      startRoute();
      badge.textContent = "Gravando";
      badge.style.background = "#14532d";
      btnAddNest.disabled = false;
      tIcon.textContent = "⏹";
      tText.textContent = "Finalizar";

      document.getElementById("info-route").textContent = "Trajeto: em gravação…";
      document.getElementById("info-nests").textContent = "Ninhos: 0";
      toast("Trajeto iniciado");
    } else {
      const route = stopRoute();

      badge.textContent = "Parado";
      badge.style.background = "#022c22";
      btnAddNest.disabled = true;
      tIcon.textContent = "▶";
      tText.textContent = "Iniciar";

      if (!route || (route.path || []).length < 2) {
        toast("Poucos pontos. Trajeto descartado.");
        state.currentRoute = null;
        return;
      }

      const defaultName =
        `Trilha ${new Date().toLocaleDateString("pt-BR")} ` +
        `${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;

      const name = prompt("Dê um nome para esta trilha:", defaultName) || defaultName;
      route.name = name;
      document.getElementById("info-route").textContent = `Trajeto: ${name}`;

      try {
        await saveRoute(route);
        toast(state.isOnline ? "Trilha salva e sincronizada" : "Trilha salva offline");
      } catch {
        // mesmo com erro, já salvou local
        toast("Salvo local. Sync tentará depois.");
      }

      renderRoutes();
    }
  };

  btnAddNest.onclick = async () => {
    if (!state.currentRoute?.path?.length) return toast("Inicie um trajeto antes.");

    const modal = await openNestModal();
    if (!modal) return;

    const last = state.currentRoute.path[state.currentRoute.path.length - 1];
    const nest = {
      lat: last.lat,
      lng: last.lng,
      description: modal.description || "",
      created_at: new Date().toISOString(),
      photoUrl: null,
      photoLocalKey: null,
    };

    // Foto: online tenta subir agora; offline salva no IDB
    if (modal.file) {
      if (state.isOnline) {
        try {
          const ext = "jpg";
          const filePath = `ninho-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

          const { error } = await supabaseClient.storage
            .from("ninhos-fotos")
            .upload(filePath, modal.file, { contentType: modal.file.type || "image/jpeg" });

          if (!error) {
            const { data: pub } = supabaseClient.storage.from("ninhos-fotos").getPublicUrl(filePath);
            nest.photoUrl = pub.publicUrl;
          } else {
            // fallback: salva offline
            nest.photoLocalKey = await idbPutPhoto(modal.file);
          }
        } catch {
          nest.photoLocalKey = await idbPutPhoto(modal.file);
        }
      } else {
        // offline: salva em IDB
        nest.photoLocalKey = await idbPutPhoto(modal.file);
      }
    }

    state.currentRoute.nests.push(nest);

    document.getElementById("info-nests").textContent = `Ninhos: ${state.currentRoute.nests.length}`;
    toast(state.isOnline ? "Ninho marcado" : "Ninho salvo offline");

    // Marker
    const marker = L.marker([nest.lat, nest.lng]).addTo(state.nestsLayer);
    const desc = (nest.description || "Sem observações.").replaceAll("<","&lt;").replaceAll(">","&gt;");
    if (nest.photoUrl) {
      marker.bindPopup(`<div style="font-size:12px"><strong>Ninho</strong><br><img src="${nest.photoUrl}" style="max-width:140px;border-radius:8px;margin-top:6px"/><br>${desc}</div>`);
    } else {
      marker.bindPopup(`<div style="font-size:12px"><strong>Ninho</strong><br>${desc}${nest.photoLocalKey ? "<br><em>(foto offline)</em>" : ""}</div>`);
    }
  };

  document.getElementById("btn-refresh").onclick = async () => {
    await safeSync(true);
    renderRoutes();
  };

  renderRoutes();
}

function renderRoutes() {
  const container = document.getElementById("routes-list");
  renderRoutesList(container, state.allRoutes, {
    onView: (route) => drawRoute(route),
    onRename: async (route) => {
      const newName = prompt("Novo nome:", route.name || "");
      if (!newName || newName === route.name) return;

      route.name = newName;
      persistStateRoutes();
      renderRoutes();

      if (route.id && state.isOnline) {
        try {
          await supabaseClient.from("routes").update({ name: newName }).eq("id", route.id);
        } catch {}
      }
    },
    onDelete: async (route) => {
      if (!confirm("Excluir esta trilha?")) return;

      state.allRoutes = state.allRoutes.filter(r => r !== route);
      persistStateRoutes();
      renderRoutes();

      if (route.id && state.isOnline) {
        try {
          await supabaseClient.from("routes").delete().eq("id", route.id);
        } catch {}
      }
    },
  });
}

async function safeSync(showToast = false) {
  try {
    await syncRoutes();
    if (showToast) toast(state.isOnline ? "Atualizado (online)" : "Atualizado (offline)");
  } catch {
    if (showToast) toast("Não foi possível sincronizar agora");
  }
}

async function boot() {
  const session = await getSession();
  state.user = session?.user || null;

  if (!state.user) {
    await showAuth();
    return;
  }

  await showApp();
}

async function init() {
  initNetworkListeners({
    onOnline: async () => {
      setOnlineUI();
      await safeSync(true);
      renderRoutes();
    },
    onOffline: () => {
      setOnlineUI();
      toast("Você ficou offline");
    },
  });

  onAuthChange(async () => {
    await boot();
  });

  await boot();

  // PWA SW
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

init();

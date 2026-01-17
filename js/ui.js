import { state } from "./state.js";

export const ui = {
  // Telas Principais
  authScreen: document.getElementById("auth-screen"),
  appScreen: document.getElementById("app-screen"),
  
  // Login Inputs & Botoes
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authMsg: document.getElementById("auth-msg"),
  btnSignIn: document.getElementById("btn-signin"),
  btnSignUp: document.getElementById("btn-signup"),
  btnGoogle: document.getElementById("btn-google"),
  
  // Sidebar & Navegação
  sidebar: document.getElementById("sidebar"),
  userEmailLabel: document.getElementById("user-email-label"),
  btnLogout: document.getElementById("btn-logout"),
  btnOpenSidebar: document.getElementById("btn-open-sidebar"),
  btnCloseSidebar: document.getElementById("close-sidebar"),
  navLinks: document.querySelectorAll(".nav-item[data-target]"),
  
  // Painéis de Conteúdo
  panelDashboard: document.getElementById("panel-dashboard"),
  panelTracker: document.getElementById("panel-tracker"),
  panelColonies: document.getElementById("panel-colonies"),
  
  // Cards do Dashboard (Botões)
  cardGotoTracker: document.getElementById("card-goto-tracker"),
  cardGotoColonies: document.getElementById("card-goto-colonies"),

  // Controles do Rastreador (IDs mantidos para compatibilidade com routes.js)
  statusPill: document.getElementById("status-pill"),
  cloudStatus: document.getElementById("cloud-status"),
  
  btnToggleRoute: document.getElementById("btn-toggle-route"),
  btnToggleIcon: document.getElementById("btn-toggle-icon"),
  btnToggleText: document.getElementById("btn-toggle-text"),
  btnAddNest: document.getElementById("btn-add-nest"),
  badgeStatus: document.getElementById("badge-status"),
  
  infoRouteName: document.getElementById("info-route-name"),
  infoDistance: document.getElementById("info-distance"),
  infoNests: document.getElementById("info-nests"),
  infoGps: document.getElementById("info-gps"),
  
  routesList: document.getElementById("routes-list"),
  btnRefresh: document.getElementById("btn-refresh"),

  // Modais
  photoModal: document.getElementById("photo-modal"),
  photoModalImg: document.getElementById("photo-modal-img"),
  photoModalClose: document.getElementById("photo-modal-close"),
  
  nestModal: document.getElementById("nest-modal"),
  nestNotes: document.getElementById("nest-notes"),
  nestFileInput: document.getElementById("nest-file-input"),
  nestFileName: document.getElementById("nest-file-name"),
  nestCancel: document.getElementById("nest-cancel"),
  nestSave: document.getElementById("nest-save"),
};

/* ===== LÓGICA DE NAVEGAÇÃO ENTRE PAINÉIS ===== */

export function initNavigation() {
  // Mobile Sidebar Toggle
  ui.btnOpenSidebar?.addEventListener("click", () => {
    ui.sidebar.classList.add("open");
    ui.sidebar.classList.remove("hidden-mobile");
  });
  
  ui.btnCloseSidebar?.addEventListener("click", () => {
    ui.sidebar.classList.remove("open");
    setTimeout(() => ui.sidebar.classList.add("hidden-mobile"), 300);
  });

  // Clique nos itens do Menu
  ui.navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      // Ignora itens desativados
      if (link.classList.contains("disabled")) return;

      const target = link.dataset.target;
      switchPanel(target);
      
      // Fecha menu no mobile ao clicar
      ui.sidebar.classList.remove("open");
      
      // Atualiza classe active
      ui.navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Clique nos Cards do Dashboard
  ui.cardGotoTracker?.addEventListener("click", () => {
    switchPanel("tracker");
    updateActiveLink("tracker");
  });
  
  ui.cardGotoColonies?.addEventListener("click", () => {
    switchPanel("colonies");
    updateActiveLink("colonies");
  });
}

function updateActiveLink(targetName) {
  ui.navLinks.forEach(l => {
    l.classList.toggle("active", l.dataset.target === targetName);
  });
}

function switchPanel(panelName) {
  // Esconde todos
  ui.panelDashboard.classList.add("hidden");
  ui.panelTracker.classList.add("hidden");
  ui.panelColonies.classList.add("hidden");

  // Mostra o escolhido
  if (panelName === "dashboard") ui.panelDashboard.classList.remove("hidden");
  if (panelName === "colonies") ui.panelColonies.classList.remove("hidden");
  
  if (panelName === "tracker") {
    ui.panelTracker.classList.remove("hidden");
    // CRÍTICO: O Leaflet precisa saber que a div apareceu para desenhar o mapa
    setTimeout(() => {
      if (state.map) state.map.invalidateSize();
    }, 100);
  }
}

/* ===== MENSAGENS E LOGIN ===== */

export function setAuthMessage(text, isError = false) {
  ui.authMsg.textContent = text || "";
  ui.authMsg.classList.toggle("error", !!text && isError);
}

export function showAuthScreen() {
  ui.authScreen.classList.remove("hidden");
  ui.appScreen.classList.add("hidden");
}

export function showAppScreen(email) {
  ui.authScreen.classList.add("hidden");
  ui.appScreen.classList.remove("hidden");
  
  // Formata o email para exibir nome
  const name = email ? email.split("@")[0] : "Usuário";
  ui.userEmailLabel.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Inicializa navegação apenas uma vez
  if (!ui.appScreen.dataset.navInit) {
    initNavigation();
    ui.appScreen.dataset.navInit = "true";
  }
  
  // Inicia no Dashboard
  switchPanel("dashboard");
}

export function updateOnlineStatusPill() {
  state.isOnline = navigator.onLine;
  if (state.isOnline) {
    ui.statusPill.style.borderColor = "#238636";
    ui.cloudStatus.textContent = "Online";
    const dot = ui.statusPill.querySelector(".status-dot");
    if(dot) dot.style.background = "#238636";
  } else {
    ui.statusPill.style.borderColor = "#da3633";
    ui.cloudStatus.textContent = "Offline";
    const dot = ui.statusPill.querySelector(".status-dot");
    if(dot) dot.style.background = "#da3633";
  }
}

export function setRecordingUI(isRecording) {
  if (isRecording) {
    ui.btnAddNest.disabled = false;
    ui.badgeStatus.textContent = "Gravando";
    ui.badgeStatus.style.borderColor = "#238636";
    ui.badgeStatus.style.color = "#238636";
    
    ui.btnToggleText.textContent = "Finalizar";
    ui.btnToggleIcon.textContent = "⏹";
    ui.btnToggleRoute.style.background = "#da3633"; // Vermelho para parar
    
    ui.infoRouteName.textContent = "Trajeto: gravando...";
  } else {
    ui.btnAddNest.disabled = true;
    ui.badgeStatus.textContent = "Parado";
    ui.badgeStatus.style.borderColor = "#30363d";
    ui.badgeStatus.style.color = "#8b949e";
    
    ui.btnToggleText.textContent = "Iniciar trajeto";
    ui.btnToggleIcon.textContent = "▶";
    ui.btnToggleRoute.style.background = "#238636"; // Verde para iniciar
  }
}

/* ===== MODAL LOGIC (Mantida Idêntica) ===== */

let pendingNestResolve = null;
let selectedNestFile = null;

export function openNestModal() {
  selectedNestFile = null;
  ui.nestNotes.value = "";
  ui.nestFileInput.value = "";
  ui.nestFileName.textContent = "";
  ui.nestModal.style.display = "flex";

  return new Promise((resolve) => {
    pendingNestResolve = resolve;
  });
}

export function closeNestModal() {
  ui.nestModal.style.display = "none";
  if (pendingNestResolve) {
    pendingNestResolve(null);
    pendingNestResolve = null;
  }
}

export function initNestModalHandlers() {
  ui.nestCancel.addEventListener("click", () => closeNestModal());

  ui.nestFileInput.addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    selectedNestFile = file || null;
    ui.nestFileName.textContent = file ? file.name : "";
  });

  ui.nestSave.addEventListener("click", () => {
    if (!pendingNestResolve) {
      ui.nestModal.style.display = "none";
      return;
    }
    const payload = {
      description: ui.nestNotes.value.trim(),
      file: selectedNestFile,
    };
    ui.nestModal.style.display = "none";
    pendingNestResolve(payload);
    pendingNestResolve = null;
  });
}

/* ===== MODAL FOTO ===== */

export function openPhotoModal(url) {
  ui.photoModalImg.src = url;
  ui.photoModal.style.display = "flex";
}

export function initPhotoModalHandlers() {
  ui.photoModalClose.addEventListener("click", () => {
    ui.photoModal.style.display = "none";
    ui.photoModalImg.src = "";
  });

  ui.photoModal.addEventListener("click", (e) => {
    if (e.target === ui.photoModal) {
      ui.photoModal.style.display = "none";
      ui.photoModalImg.src = "";
    }
  });
}
import { state } from "./state.js";

export const ui = {
  authScreen: document.getElementById("auth-screen"),
  appScreen: document.getElementById("app-screen"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authMsg: document.getElementById("auth-msg"),
  btnSignIn: document.getElementById("btn-signin"),
  btnSignUp: document.getElementById("btn-signup"),
  btnGoogle: document.getElementById("btn-google"),
  
  sidebar: document.getElementById("sidebar"),
  userEmailLabel: document.getElementById("user-email-label"),
  btnLogout: document.getElementById("btn-logout"),
  btnOpenSidebar: document.getElementById("btn-open-sidebar"),
  btnCloseSidebar: document.getElementById("close-sidebar"),
  navLinks: document.querySelectorAll(".nav-item[data-target]"),
  
  // Painéis
  panelDashboard: document.getElementById("panel-dashboard"),
  panelTracker: document.getElementById("panel-tracker"),
  panelColonies: document.getElementById("panel-colonies"),
  panelCaptures: document.getElementById("panel-captures"), // Novo
  
  // Cards Dashboard
  cardGotoTracker: document.getElementById("card-goto-tracker"),
  cardGotoColonies: document.getElementById("card-goto-colonies"),
  cardGotoCaptures: document.getElementById("card-goto-captures"), // Novo

  // Badges
  badgeCapturas: document.getElementById("badge-capturas"),
  cardBadgeCaptures: document.getElementById("card-badge-captures"),

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
  
  latestRouteContainer: document.getElementById("latest-route-container"),
  btnViewAllHistory: document.getElementById("btn-view-all-history"),
  
  tabBtnMatrices: document.getElementById("tab-btn-matrices"),
  tabBtnHistory: document.getElementById("tab-btn-history"),
  contentMatrices: document.getElementById("content-matrices"),
  contentHistory: document.getElementById("content-history"),
  fullHistoryList: document.getElementById("full-history-list"),
  btnRefreshHistory: document.getElementById("btn-refresh-history"),
  
  // Lista de Capturas
  capturesList: document.getElementById("captures-list"),

  // Modais
  photoModal: document.getElementById("photo-modal"),
  photoModalImg: document.getElementById("photo-modal-img"),
  photoModalClose: document.getElementById("photo-modal-close"),
  btnEditNest: document.getElementById("btn-edit-nest"),
  btnDeleteNest: document.getElementById("btn-delete-nest"),
  editNestForm: document.getElementById("edit-nest-form"),
  editStatusSelect: document.getElementById("edit-status-select"),
  editNotes: document.getElementById("edit-notes"),
  btnCancelEdit: document.getElementById("btn-cancel-edit"),
  btnSaveEdit: document.getElementById("btn-save-edit"),
  
  nestModal: document.getElementById("nest-modal"),
  nestNotes: document.getElementById("nest-notes"),
  nestFileInput: document.getElementById("nest-file-input"),
  nestFileName: document.getElementById("nest-file-name"),
  nestCancel: document.getElementById("nest-cancel"),
  nestSave: document.getElementById("nest-save"),
};

export function initNavigation() {
  ui.btnOpenSidebar?.addEventListener("click", () => {
    ui.sidebar.classList.add("open");
    ui.sidebar.classList.remove("hidden-mobile");
  });
  ui.btnCloseSidebar?.addEventListener("click", () => {
    ui.sidebar.classList.remove("open");
    setTimeout(() => ui.sidebar.classList.add("hidden-mobile"), 300);
  });

  ui.navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (link.classList.contains("disabled")) return;
      const target = link.dataset.target;
      switchPanel(target);
      ui.sidebar.classList.remove("open");
      ui.navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  ui.cardGotoTracker?.addEventListener("click", () => { switchPanel("tracker"); updateActiveLink("tracker"); });
  ui.cardGotoColonies?.addEventListener("click", () => { switchPanel("colonies"); updateActiveLink("colonies"); });
  ui.cardGotoCaptures?.addEventListener("click", () => { switchPanel("captures"); updateActiveLink("captures"); });

  ui.btnViewAllHistory?.addEventListener("click", () => {
    switchPanel("colonies");
    updateActiveLink("colonies");
    switchColonyTab("history");
  });

  ui.tabBtnMatrices?.addEventListener("click", () => switchColonyTab("matrices"));
  ui.tabBtnHistory?.addEventListener("click", () => switchColonyTab("history"));
}

function updateActiveLink(targetName) {
  ui.navLinks.forEach(l => l.classList.toggle("active", l.dataset.target === targetName));
}

export function switchPanel(panelName) {
  ui.panelDashboard.classList.add("hidden");
  ui.panelTracker.classList.add("hidden");
  ui.panelColonies.classList.add("hidden");
  ui.panelCaptures.classList.add("hidden");

  if (panelName === "dashboard") ui.panelDashboard.classList.remove("hidden");
  if (panelName === "colonies") ui.panelColonies.classList.remove("hidden");
  if (panelName === "captures") ui.panelCaptures.classList.remove("hidden");
  
  if (panelName === "tracker") {
    ui.panelTracker.classList.remove("hidden");
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 100);
  }
}

export function switchColonyTab(tabName) {
  if (tabName === "matrices") {
    ui.contentMatrices.classList.remove("hidden");
    ui.contentHistory.classList.add("hidden");
    ui.tabBtnMatrices.classList.add("active");
    ui.tabBtnHistory.classList.remove("active");
  } else {
    ui.contentMatrices.classList.add("hidden");
    ui.contentHistory.classList.remove("hidden");
    ui.tabBtnMatrices.classList.remove("active");
    ui.tabBtnHistory.classList.add("active");
  }
}

/* OUTRAS FUNÇÕES UI (Auth, Status, Modals) - IDÊNTICAS AO ANTERIOR */
export function setAuthMessage(text, isError = false) {
  ui.authMsg.textContent = text || "";
  ui.authMsg.classList.toggle("error", !!text && isError);
}
export function showAuthScreen() { ui.authScreen.classList.remove("hidden"); ui.appScreen.classList.add("hidden"); }
export function showAppScreen(email) {
  ui.authScreen.classList.add("hidden"); ui.appScreen.classList.remove("hidden");
  const name = email ? email.split("@")[0] : "Usuário";
  ui.userEmailLabel.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  if (!ui.appScreen.dataset.navInit) { initNavigation(); ui.appScreen.dataset.navInit = "true"; }
  switchPanel("dashboard");
}
export function updateOnlineStatusPill() {
  state.isOnline = navigator.onLine; const color = state.isOnline ? "#238636" : "#da3633";
  ui.statusPill.style.borderColor = color; ui.cloudStatus.textContent = state.isOnline ? "Online" : "Offline";
  const dot = ui.statusPill.querySelector(".status-dot"); if(dot) dot.style.background = color;
}
export function setRecordingUI(isRecording) {
  if (isRecording) {
    ui.btnAddNest.disabled = false; ui.badgeStatus.textContent = "Gravando"; ui.badgeStatus.style.borderColor = "#238636"; ui.badgeStatus.style.color = "#238636";
    ui.btnToggleText.textContent = "Finalizar"; ui.btnToggleIcon.textContent = "⏹"; ui.btnToggleRoute.style.background = "#da3633";
    ui.infoRouteName.textContent = "Trajeto: gravando...";
  } else {
    ui.btnAddNest.disabled = true; ui.badgeStatus.textContent = "Parado"; ui.badgeStatus.style.borderColor = "#30363d"; ui.badgeStatus.style.color = "#8b949e";
    ui.btnToggleText.textContent = "Iniciar trajeto"; ui.btnToggleIcon.textContent = "▶"; ui.btnToggleRoute.style.background = "#238636";
  }
}

let pendingNestResolve = null; let selectedNestFile = null;
export function openNestModal() { selectedNestFile = null; ui.nestNotes.value = ""; ui.nestFileInput.value = ""; ui.nestFileName.textContent = ""; ui.nestModal.style.display = "flex"; return new Promise((resolve) => { pendingNestResolve = resolve; }); }
export function closeNestModal() { ui.nestModal.style.display = "none"; if (pendingNestResolve) { pendingNestResolve(null); pendingNestResolve = null; } }
export function initNestModalHandlers() {
  ui.nestCancel.addEventListener("click", () => closeNestModal());
  ui.nestFileInput.addEventListener("change", (ev) => { const file = ev.target.files[0]; selectedNestFile = file || null; ui.nestFileName.textContent = file ? file.name : ""; });
  ui.nestSave.addEventListener("click", () => { if (!pendingNestResolve) { ui.nestModal.style.display = "none"; return; } const payload = { description: ui.nestNotes.value.trim(), file: selectedNestFile }; ui.nestModal.style.display = "none"; pendingNestResolve(payload); pendingNestResolve = null; });
}

let currentNestData = null; let currentRouteId = null; let editSaveCallback = null; let deleteCallback = null;
export function openPhotoModal(nestData, routeId, onSave, onDelete) {
  currentNestData = nestData; currentRouteId = routeId; editSaveCallback = onSave; deleteCallback = onDelete;
  ui.photoModalImg.src = nestData.photoUrl; ui.photoModal.style.display = "flex";
  ui.editNestForm.classList.add("hidden");
  ui.editStatusSelect.value = nestData.status || 'catalogado'; ui.editNotes.value = nestData.description || '';
  if (!nestData.id) { ui.btnEditNest.classList.add("hidden"); ui.btnDeleteNest.classList.add("hidden"); }
  else { ui.btnEditNest.classList.remove("hidden"); ui.btnDeleteNest.classList.remove("hidden"); }
}
export function closePhotoModal() { ui.photoModal.style.display = "none"; ui.photoModalImg.src = ""; currentNestData = null; }
export function initPhotoModalHandlers() {
  ui.photoModalClose.addEventListener("click", closePhotoModal);
  ui.photoModal.addEventListener("click", (e) => { if (e.target === ui.photoModal && ui.editNestForm.classList.contains("hidden")) closePhotoModal(); });
  ui.btnEditNest.addEventListener("click", () => { ui.editNestForm.classList.remove("hidden"); });
  ui.btnCancelEdit.addEventListener("click", () => { ui.editNestForm.classList.add("hidden"); ui.editStatusSelect.value = currentNestData.status || 'catalogado'; ui.editNotes.value = currentNestData.description || ''; });
  ui.btnSaveEdit.addEventListener("click", () => { const newStatus = ui.editStatusSelect.value; const newNotes = ui.editNotes.value; if(editSaveCallback) editSaveCallback(currentRouteId, currentNestData.id, newStatus, newNotes); closePhotoModal(); });
  ui.btnDeleteNest.addEventListener("click", () => { const reason = prompt("Motivo da exclusão (ex: 'manutenção'):"); if (reason && confirm("Confirmar exclusão?")) { if(deleteCallback) deleteCallback(currentRouteId, currentNestData.id, reason); closePhotoModal(); } });
}
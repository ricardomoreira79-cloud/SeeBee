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
  btnLogout: document.getElementById("btn-logout"),
  userEmailLabel: document.getElementById("user-email-label"),

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

let pendingNestResolve = null;
let selectedNestFile = null;

export function setAuthMessage(text, isError = false) {
  ui.authMsg.textContent = text || "";
  ui.authMsg.classList.toggle("error", !!text && isError);
  ui.authMsg.classList.toggle("ok", !!text && !isError);
}

export function showAuthScreen() {
  ui.authScreen.classList.remove("hidden");
  ui.appScreen.classList.add("hidden");
}

export function showAppScreen(email) {
  ui.authScreen.classList.add("hidden");
  ui.appScreen.classList.remove("hidden");
  ui.userEmailLabel.textContent = email || "";
}

export function updateOnlineStatusPill() {
  state.isOnline = navigator.onLine;

  if (state.isOnline) {
    ui.statusPill.classList.remove("offline");
    ui.cloudStatus.textContent = "Trabalhando online";
  } else {
    ui.statusPill.classList.add("offline");
    ui.cloudStatus.textContent = "Trabalhando offline – dados só neste aparelho";
  }
}

export function setRecordingUI(isRecording) {
  if (isRecording) {
    ui.btnAddNest.disabled = false;
    ui.badgeStatus.textContent = "Gravando";
    ui.badgeStatus.style.background = "#14532d";
    ui.btnToggleText.textContent = "Finalizar trajeto";
    ui.btnToggleIcon.textContent = "⏹";
    ui.infoRouteName.textContent = "Trajeto: em gravação...";
    ui.infoDistance.textContent = "Distância: 0 m";
    ui.infoNests.textContent = "Ninhos: 0";
  } else {
    ui.btnAddNest.disabled = true;
    ui.badgeStatus.textContent = "Parado";
    ui.badgeStatus.style.background = "#022c22";
    ui.btnToggleText.textContent = "Iniciar trajeto";
    ui.btnToggleIcon.textContent = "▶";
  }
}

/* ===== Modal Marcar Ninho ===== */

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

/* ===== Modal Foto ===== */

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

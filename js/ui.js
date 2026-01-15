// js/ui.js
export const ui = {
  // Telas
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // Views
  views: {
    home: document.querySelector("#view-home"), // HOME
    traps: document.querySelector("#view-traps"),
    meliponaries: document.querySelector("#view-meliponaries"),
    captures: document.querySelector("#view-captures"),
    profile: document.querySelector("#view-profile")
  },
  
  // Login
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),

  // Menu
  sideMenu: document.querySelector("#side-menu"),
  openMenu: document.querySelector("#open-menu"),
  closeMenu: document.querySelector("#close-menu"),
  menuItems: document.querySelectorAll(".menu-item"),
  btnLogout: document.querySelector("#btnLogout"),
  menuEmail: document.querySelector("#menu-email-display"),
  menuAvatar: document.querySelector("#menu-avatar-char"),

  // Trilha e Dashboard
  dashCards: document.querySelectorAll(".dash-card"),
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  gpsStatus: document.querySelector("#gpsStatus"),
  statusBadge: document.querySelector("#statusBadge"),
  routeHint: document.querySelector("#routeHint"),
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),

  // Modal
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),

  // Status
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText"),
  statusPill: document.querySelector("#statusPill")
};

export function switchTab(targetId) {
  Object.values(ui.views).forEach(el => { if(el) el.classList.add("hidden"); });
  const target = document.querySelector("#" + targetId);
  if(target) target.classList.remove("hidden");
}

export function toast(el, msg, type="ok") {
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.style.border = (type === 'error') ? '1px solid #ef4444' : '1px solid #10b981';
  setTimeout(() => el.classList.add("hidden"), 3500);
}

export function showScreen(name) {
  if(name === "login") {
    ui.screenLogin.classList.remove("hidden");
    ui.screenApp.classList.add("hidden");
  } else {
    ui.screenLogin.classList.add("hidden");
    ui.screenApp.classList.remove("hidden");
  }
}

// CORREÇÃO VISUAL OFFLINE
export function setOnlineUI(isOnline) {
  if(!ui.statusPill) return;
  
  if(isOnline) {
    ui.statusPill.style.borderColor = "#10b981"; // Verde
    ui.statusPill.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
    ui.onlineDot.style.backgroundColor = "#10b981";
    ui.onlineText.textContent = "Conectado";
    ui.onlineText.style.color = "#10b981";
  } else {
    ui.statusPill.style.borderColor = "#ef4444"; // Vermelho
    ui.statusPill.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
    ui.onlineDot.style.backgroundColor = "#ef4444";
    ui.onlineText.textContent = "Offline (Local)";
    ui.onlineText.style.color = "#ef4444";
  }
}

export function closeNestModal() {
  ui.modalNest.style.display = "none";
  ui.nestNote.value = "";
  ui.nestPhoto.value = "";
}
// js/ui.js
export const ui = {
  // Telas
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // Views
  views: {
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

  // Menu Lateral
  sideMenu: document.querySelector("#side-menu"),
  openMenu: document.querySelector("#open-menu"),
  closeMenu: document.querySelector("#close-menu"),
  menuItems: document.querySelectorAll(".menu-item"),
  btnLogout: document.querySelector("#btnLogout"),
  
  // Perfil no Menu
  menuEmail: document.querySelector("#menu-email-display"),
  menuAvatar: document.querySelector("#menu-avatar-char"),

  // Trilha (BeeTrack IDs)
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
  // Esconde todas
  Object.values(ui.views).forEach(el => { if(el) el.classList.add("hidden"); });
  
  // Mostra alvo
  const target = document.querySelector("#" + targetId);
  if(target) target.classList.remove("hidden");

  // Atualiza menu lateral (visual)
  if(ui.menuItems) {
    ui.menuItems.forEach(item => {
      if(item.dataset.target === targetId) item.classList.add("active");
      else item.classList.remove("active");
    });
  }
}

export function toast(el, msg, type="ok") {
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  if(type === 'error') el.style.border = '1px solid #ef4444';
  else el.style.border = '1px solid #10b981';
  
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

export function setOnlineUI(isOnline) {
  if(!ui.onlineDot) return;
  if(isOnline) {
    ui.onlineDot.classList.remove("offline");
    ui.onlineText.textContent = "Conectado";
  } else {
    ui.onlineDot.classList.add("offline");
    ui.onlineText.textContent = "Offline";
  }
}

export function closeNestModal() {
  ui.modalNest.style.display = "none";
  ui.nestNote.value = "";
  ui.nestPhoto.value = "";
}
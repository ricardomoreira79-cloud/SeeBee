// js/ui.js
export const ui = {
  // Telas
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // Views (Adicionei view-home)
  views: {
    home: document.querySelector("#view-home"),
    meliponaries: document.querySelector("#view-meliponaries"),
    traps: document.querySelector("#view-traps"),
    captures: document.querySelector("#view-captures"),
    profile: document.querySelector("#view-profile")
  },
  
  // Navegação
  navItems: document.querySelectorAll(".nav-item"),
  sideMenu: document.querySelector("#side-menu"),
  openMenu: document.querySelector("#open-menu"),
  closeMenu: document.querySelector("#close-menu"),
  btnLogout: document.querySelector("#btnLogout"),
  
  // Dashboard Cards (Novo)
  dashCards: document.querySelectorAll(".dash-card"),

  // Login
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),

  // Status
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText"),
  statusPill: document.querySelector("#statusPill"),

  // Mapa & Trilhas
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),
  
  // Listas
  capturedList: document.querySelector("#capturedList"),

  // Modal
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel")
};

export function switchTab(targetId) {
  // 1. Esconde todas as views
  Object.values(ui.views).forEach(el => {
    if(el) el.classList.add("hidden");
  });
  
  // 2. Mostra a view alvo
  const target = document.getElementById(targetId);
  if(target) target.classList.remove("hidden");

  // 3. Atualiza a barra inferior
  ui.navItems.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.target === targetId);
  });
}

export function setOnlineUI(isOnline, hide=false) {
  if(!ui.statusPill) return;
  if(hide) ui.statusPill.classList.add("hidden");
  else {
    ui.statusPill.classList.remove("hidden");
    ui.statusPill.style.borderColor = isOnline ? "#22c55e" : "#ef4444";
    ui.onlineDot.style.backgroundColor = isOnline ? "#22c55e" : "#ef4444";
    ui.onlineText.textContent = isOnline ? "Online" : "Offline";
  }
}

export function toast(el, msg) {
  if(el) el.textContent = msg;
}

export function closeNestModal() {
  ui.modalNest.style.display = "none";
  ui.nestNote.value = "";
  ui.nestPhoto.value = "";
}

export function clearNestForm() {
  // Helper
}
// js/ui.js
export const ui = {
  // auth
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),

  // cabeçalho e status
  onlinePill: document.querySelector("#onlinePill"),
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText"),

  // telas principais (sections)
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // views containers para navegação
  views: {
    meliponaries: document.querySelector("#view-meliponaries"),
    traps: document.querySelector("#view-traps"),
    natural: document.querySelector("#view-natural"),
    profile: document.querySelector("#view-profile")
  },
  
  // itens da navegação inferior
  navItems: document.querySelectorAll(".nav-item"),
  
  // submenus da aba de iscas
  subBtns: document.querySelectorAll(".segment-btn"),
  subViews: {
    "sub-deposit": document.querySelector("#sub-deposit"),
    "sub-trails": document.querySelector("#sub-trails"),
    "sub-captured": document.querySelector("#sub-captured")
  },

  // controles de trilha e mapa
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),

  // listas de dados
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),
  capturedList: document.querySelector("#capturedList"),
  capturedEmpty: document.querySelector("#capturedEmpty"),
  allNestsList: document.querySelector("#allNestsList"),

  // modal de marcação de ninho
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),

  // dados do perfil
  p_email_display: document.querySelector("#p_email_display"),
  p_initials: document.querySelector("#p_initials"),
  p_id_short: document.querySelector("#p_id_short"),
  btnLogoutAction: document.querySelector("#btnLogoutAction")
};

// Funções de utilidade da UI
export function toast(el, msg, type = "ok") {
  if (!el) return;
  el.textContent = msg;
  el.className = "hint-box " + (type === "error" ? "error" : "ok");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

export function switchTab(targetId) {
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  Object.values(ui.views).forEach(el => {
    if (el) el.classList.add("hidden");
  });
  const targetEl = ui.views[targetId.replace("view-", "")];
  if (targetEl) targetEl.classList.remove("hidden");
}

export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.values(ui.subViews).forEach(el => {
    if (el) el.classList.add("hidden");
  });
  if (ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden");
}

export function setOnlineUI(isOnline) {
  if (!ui.onlineDot) return;
  ui.onlineDot.style.backgroundColor = isOnline ? "#22c55e" : "#ef4444";
  ui.onlineText.textContent = isOnline ? "Online" : "Offline";
}

export function openNestModal() { ui.modalNest.style.display = "flex"; }

export function closeNestModal() { 
  ui.modalNest.style.display = "none";
  clearNestForm();
}

// Função para limpar o formulário de ninhos
export function clearNestForm() {
  if (ui.nestNote) ui.nestNote.value = "";
  if (ui.nestSpecies) ui.nestSpecies.value = "";
  if (ui.nestStatus) ui.nestStatus.value = "DEPOSITADO";
  if (ui.nestPhoto) ui.nestPhoto.value = "";
}
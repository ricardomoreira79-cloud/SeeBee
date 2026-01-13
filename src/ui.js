export const ui = {
  // ... seletores anteriores mantidos ...
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),
  
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  views: {
    meliponaries: document.querySelector("#view-meliponaries"),
    traps: document.querySelector("#view-traps"),
    natural: document.querySelector("#view-natural"),
    profile: document.querySelector("#view-profile")
  },
  navItems: document.querySelectorAll(".nav-item"),
  
  // SUBMENUS (Novos)
  subBtns: document.querySelectorAll(".segment-btn"),
  subViews: {
    "sub-deposit": document.querySelector("#sub-deposit"),
    "sub-trails": document.querySelector("#sub-trails"),
    "sub-captured": document.querySelector("#sub-captured")
  },

  // Map Controls
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),
  
  // Listas
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),
  capturedList: document.querySelector("#capturedList"), // Novo
  capturedEmpty: document.querySelector("#capturedEmpty"), // Novo
  allNestsList: document.querySelector("#allNestsList"),

  // Modal
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),

  // Perfil
  p_email: document.querySelector("#p_email"),
  btnLogout: document.querySelector("#btnLogout"),
  
  // Status Indicator
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText")
};

export function toast(el, msg, type="ok") {
  if(!el) return;
  el.textContent = msg;
  el.className = "hint-box"; 
  el.classList.add(type === "error" ? "error" : "ok");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

// Troca ABAS PRINCIPAIS (Rodapé)
export function switchTab(targetId) {
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  Object.values(ui.views).forEach(el => el.classList.remove("active", "hidden"));
  if(ui.views[targetId.replace("view-", "")]) ui.views[targetId.replace("view-", "")].classList.add("active");
}

// Troca SUBMENUS (Topo da aba Iscas)
export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.values(ui.subViews).forEach(el => el.classList.add("hidden")); // esconde todos subs
  if(ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden"); // mostra alvo
}

export function setOnlineUI(isOnline) {
  if(!ui.onlineDot) return;
  ui.onlineDot.style.backgroundColor = isOnline ? "#22c55e" : "#ef4444";
  ui.onlineText.textContent = isOnline ? "Online" : "Offline";
}

export function openNestModal() { ui.modalNest.style.display = "flex"; }
export function closeNestModal() { 
  ui.modalNest.style.display = "none"; 
  ui.nestNote.value = ""; 
  ui.nestSpecies.value = "";
  ui.nestStatus.value = "DEPOSITADO"; // Reset pro padrão
  ui.nestPhoto.value = "";
}


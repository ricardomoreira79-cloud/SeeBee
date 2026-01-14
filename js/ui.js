// js/ui.js
export const ui = {
  // auth
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
  capturedList: document.querySelector("#capturedList"),
  capturedEmpty: document.querySelector("#capturedEmpty"),
  allNestsList: document.querySelector("#allNestsList"),

  // Modais
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),
  
  // Modal Foto
  photoModal: document.querySelector("#photo-modal"),
  photoModalImg: document.querySelector("#photo-modal-img"),
  photoModalClose: document.querySelector("#photo-modal-close"),

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

export function switchTab(targetId) {
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  Object.values(ui.views).forEach(el => { if(el) el.classList.remove("active", "hidden"); });
  const target = ui.views[targetId.replace("view-", "")];
  if(target) target.classList.add("active");
}

export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.values(ui.subViews).forEach(el => { if(el) el.classList.add("hidden"); });
  if(ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden");
}

// CORREÇÃO: Esta função estava faltando e quebrava o auth.js
export function setOnlineUI(isOnline, hide=false) {
  if(!ui.onlineDot) return;
  if(hide) {
    ui.onlineDot.parentElement.classList.add("hidden");
    return;
  }
  ui.onlineDot.parentElement.classList.remove("hidden");
  ui.onlineDot.className = isOnline ? "status-dot" : "status-dot offline";
  ui.onlineText.textContent = isOnline ? "Online" : "Offline";
  ui.onlineDot.parentElement.className = isOnline ? "status-pill" : "status-pill offline";
}

export function clearNestForm() {
  if(ui.nestNote) ui.nestNote.value = "";
  if(ui.nestSpecies) ui.nestSpecies.value = "";
  if(ui.nestPhoto) ui.nestPhoto.value = "";
}

export function openNestModal() { ui.modalNest.style.display = "flex"; }
export function closeNestModal() { ui.modalNest.style.display = "none"; clearNestForm(); }

export function openPhotoModal(url) {
  if(ui.photoModalImg) ui.photoModalImg.src = url;
  if(ui.photoModal) ui.photoModal.style.display = "flex";
}

export function showScreen(screenName) {
  if(screenName === "login") {
    ui.screenLogin.classList.remove("hidden");
    ui.screenApp.classList.add("hidden");
  } else {
    ui.screenLogin.classList.add("hidden");
    ui.screenApp.classList.remove("hidden");
  }
}
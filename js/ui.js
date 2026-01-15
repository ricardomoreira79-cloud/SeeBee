// js/ui.js
export const ui = {
  // auth elements
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),
  
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // views
  views: {
    home: document.querySelector("#view-home"),
    meliponaries: document.querySelector("#view-meliponaries"),
    traps: document.querySelector("#view-traps"),
    captures: document.querySelector("#view-captures"),
    profile: document.querySelector("#view-profile")
  },
  navItems: document.querySelectorAll(".nav-item"),
  
  // navigation
  sideMenu: document.querySelector("#side-menu"),
  openMenu: document.querySelector("#open-menu"),
  closeMenu: document.querySelector("#close-menu"),
  
  // sub-navigation
  subBtns: document.querySelectorAll(".segment-btn"),
  subViews: {
    "sub-deposit": document.querySelector("#sub-deposit"),
    "sub-trails": document.querySelector("#sub-trails"),
    "sub-captured": document.querySelector("#sub-captured")
  },

  // map controls
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),
  
  // lists
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),
  capturedList: document.querySelector("#capturedList"),
  capturedEmpty: document.querySelector("#capturedEmpty"),
  allNestsList: document.querySelector("#allNestsList"),

  // modal nest
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),

  // profile
  btnLogout: document.querySelector("#btnLogout"),
  
  // status
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText"),
  statusPill: document.querySelector("#statusPill")
};

export function toast(el, msg, type="ok") {
  if(!el) return;
  el.textContent = msg;
  el.className = "hint-box"; 
  if (type === 'error') el.style.color = '#ef4444'; 
  else el.style.color = '#22c55e';
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

export function switchTab(targetId) {
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  Object.values(ui.views).forEach(el => {
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(targetId);
  if(target) target.classList.remove("hidden");
}

export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.values(ui.subViews).forEach(el => el.classList.add("hidden"));
  if(ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden");
}

export function setOnlineUI(isOnline, hide=false) {
  if(!ui.statusPill) return;
  if(hide) {
    ui.statusPill.classList.add("hidden");
  } else {
    ui.statusPill.classList.remove("hidden");
    ui.statusPill.style.borderColor = isOnline ? "#22c55e" : "#ef4444";
    ui.onlineDot.style.backgroundColor = isOnline ? "#22c55e" : "#ef4444";
    ui.onlineText.textContent = isOnline ? "Online" : "Offline";
  }
}

export function clearNestForm() {
  if(ui.nestNote) ui.nestNote.value = "";
  if(ui.nestSpecies) ui.nestSpecies.value = "";
  if(ui.nestPhoto) ui.nestPhoto.value = "";
}

export function openNestModal() { 
  if(ui.modalNest) ui.modalNest.style.display = "flex"; 
}

export function closeNestModal() { 
  if(ui.modalNest) ui.modalNest.style.display = "none"; 
  clearNestForm(); 
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
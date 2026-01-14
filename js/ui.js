// js/ui.js
export const ui = {
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
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),
  capturedList: document.querySelector("#capturedList"),
  capturedEmpty: document.querySelector("#capturedEmpty"),
  allNestsList: document.querySelector("#allNestsList"),
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel"),
  p_email_display: document.querySelector("#p_email_display"), // Corrigido
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText")
};

export function toast(el, msg, type="ok") {
  if(!el) return;
  el.textContent = msg;
  el.className = "hint-box " + (type === "error" ? "error" : "ok");
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

export function switchTab(targetId) {
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  Object.values(ui.views).forEach(el => {
    el.classList.add("hidden");
    el.classList.remove("active");
  });
  const activeView = ui.views[targetId.replace("view-", "")];
  if(activeView) {
    activeView.classList.remove("hidden");
    activeView.classList.add("active");
  }
}

export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.values(ui.subViews).forEach(el => el.classList.add("hidden"));
  if(ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden");
}

export function openNestModal() { ui.modalNest.style.display = "flex"; }
export function closeNestModal() { ui.modalNest.style.display = "none"; }
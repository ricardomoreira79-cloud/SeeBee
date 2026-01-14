// js/ui.js
export const ui = {
  // ... seletores de login ...
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  
  // Abas
  navItems: document.querySelectorAll(".nav-item"),
  views: {
    meliponaries: document.querySelector("#view-meliponaries"),
    traps: document.querySelector("#view-traps"),
    natural: document.querySelector("#view-natural"),
    profile: document.querySelector("#view-profile")
  },
  
  // Sub-abas
  subBtns: document.querySelectorAll(".segment-btn"),
  subViews: {
    "sub-deposit": document.querySelector("#sub-deposit"),
    "sub-trails": document.querySelector("#sub-trails"),
    "sub-captured": document.querySelector("#sub-captured")
  },

  // Controles
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),
  capturedList: document.querySelector("#capturedList"),
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),

  // Modal
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel")
};

export function switchTab(targetId) {
  const cleanTarget = targetId.replace("view-", "");
  
  // Atualiza botões do rodapé
  ui.navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.target === targetId));
  
  // Esconde todas as views e mostra a selecionada
  Object.keys(ui.views).forEach(key => {
    if (ui.views[key]) {
      ui.views[key].classList.add("hidden");
      ui.views[key].classList.remove("active");
    }
  });

  if (ui.views[cleanTarget]) {
    ui.views[cleanTarget].classList.remove("hidden");
    ui.views[cleanTarget].classList.add("active");
  }
}

export function switchSubTab(targetSubId) {
  ui.subBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.sub === targetSubId));
  Object.keys(ui.subViews).forEach(key => {
    if (ui.subViews[key]) ui.subViews[key].classList.add("hidden");
  });
  if (ui.subViews[targetSubId]) ui.subViews[targetSubId].classList.remove("hidden");
}

export function toast(el, msg, type = "ok") {
  if (!el) return;
  el.textContent = msg;
  el.className = `hint-box ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

export function closeNestModal() {
  ui.modalNest.style.display = "none";
  ui.nestNote.value = "";
  ui.nestSpecies.value = "";
  ui.nestPhoto.value = "";
}
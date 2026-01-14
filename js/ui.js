export const ui = {
  // Telas
  screenLogin: document.querySelector("#auth-screen"),
  screenApp: document.querySelector("#app-screen"),
  sideMenu: document.querySelector("#side-menu"),
  openMenu: document.querySelector("#open-menu"),
  closeMenu: document.querySelector("#close-menu"),
  btnLogout: document.querySelector("#btnLogout"),
  
  // Login
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  
  // Trilha
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  routeHint: document.querySelector("#routeHint"),
  
  // Modais
  modalNest: document.querySelector("#nest-modal"),
  nestNote: document.querySelector("#nestNote"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnConfirmNest: document.querySelector("#btnConfirmNest"),
  nestCancel: document.querySelector("#nestCancel")
};

export function switchTab(targetId) {
  document.querySelectorAll(".view-section").forEach(s => s.classList.add("hidden"));
  const activeView = document.getElementById(targetId);
  if(activeView) activeView.classList.remove("hidden");
  
  document.querySelectorAll(".menu-item").forEach(m => {
    m.classList.toggle("active", m.dataset.target === targetId);
  });
}

export function toast(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
  el.className = "hint-box ok";
  setTimeout(() => el.classList.add("hidden"), 3000);
}

export function closeNestModal() {
  ui.modalNest.style.display = "none";
  ui.nestNote.value = "";
  ui.nestPhoto.value = "";
}
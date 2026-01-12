import { state } from "./state.js";

export const ui = {
  // screens
  topbar: document.getElementById("topbar"),
  authScreen: document.getElementById("authScreen"),
  appScreen: document.getElementById("appScreen"),

  screenHome: document.getElementById("screenHome"),
  screenTrails: document.getElementById("screenTrails"),
  screenNests: document.getElementById("screenNests"),
  screenProfile: document.getElementById("screenProfile"),

  // auth
  authEmail: document.getElementById("authEmail"),
  authPass: document.getElementById("authPass"),
  btnLogin: document.getElementById("btnLogin"),
  btnSignup: document.getElementById("btnSignup"),
  btnGoogle: document.getElementById("btnGoogle"),
  authMsg: document.getElementById("authMsg"),

  // drawer
  drawer: document.getElementById("drawer"),
  backdrop: document.getElementById("backdrop"),
  btnMenu: document.getElementById("btnMenu"),
  btnCloseDrawer: document.getElementById("btnCloseDrawer"),
  btnLogout: document.getElementById("btnLogout"),
  drawerEmail: document.getElementById("drawerEmail"),

  // online pill
  onlinePill: document.getElementById("onlinePill"),
  onlineDot: document.getElementById("onlineDot"),
  onlineText: document.getElementById("onlineText"),

  // route
  btnStartRoute: document.getElementById("btnStartRoute"),
  btnFinishRoute: document.getElementById("btnFinishRoute"),
  distanceText: document.getElementById("distanceText"),
  nestsCountText: document.getElementById("nestsCountText"),
  routeHint: document.getElementById("routeHint"),

  // nests
  nestNote: document.getElementById("nestNote"),
  nestStatus: document.getElementById("nestStatus"),
  nestSpecies: document.getElementById("nestSpecies"),
  nestPhoto: document.getElementById("nestPhoto"),
  btnMarkNest: document.getElementById("btnMarkNest"),
  nestMsg: document.getElementById("nestMsg"),
  nestList: document.getElementById("nestList"),

  // trails list
  trailsEmpty: document.getElementById("trailsEmpty"),
  trailsList: document.getElementById("trailsList"),

  // all nests list
  nestsEmpty: document.getElementById("nestsEmpty"),
  allNestsList: document.getElementById("allNestsList"),

  // profile
  p_full_name: document.getElementById("p_full_name"),
  p_email: document.getElementById("p_email"),
  p_whatsapp: document.getElementById("p_whatsapp"),
  p_role_type: document.getElementById("p_role_type"),
  p_doc_type: document.getElementById("p_doc_type"),
  p_doc_value: document.getElementById("p_doc_value"),
  p_address_street: document.getElementById("p_address_street"),
  p_address_city: document.getElementById("p_address_city"),
  p_address_state: document.getElementById("p_address_state"),
  p_address_zip: document.getElementById("p_address_zip"),
  p_meliponary_name: document.getElementById("p_meliponary_name"),
  p_meliponary_has_own_address: document.getElementById("p_meliponary_has_own_address"),
  p_meliponary_address_street: document.getElementById("p_meliponary_address_street"),
  p_meliponary_address_city: document.getElementById("p_meliponary_address_city"),
  p_meliponary_address_state: document.getElementById("p_meliponary_address_state"),
  p_meliponary_address_zip: document.getElementById("p_meliponary_address_zip"),
  btnSaveProfile: document.getElementById("btnSaveProfile"),
  profileMsg: document.getElementById("profileMsg")
};

export function showAuth() {
  ui.topbar.classList.add("hidden");
  ui.appScreen.classList.add("hidden");
  ui.authScreen.classList.remove("hidden");
}

export function showApp() {
  ui.authScreen.classList.add("hidden");
  ui.topbar.classList.remove("hidden");
  ui.appScreen.classList.remove("hidden");
}

export function showScreen(name) {
  const screens = [ui.screenHome, ui.screenTrails, ui.screenNests, ui.screenProfile];
  screens.forEach(s => s.classList.add("hidden"));

  if (name === "home") ui.screenHome.classList.remove("hidden");
  if (name === "trails") ui.screenTrails.classList.remove("hidden");
  if (name === "nests") ui.screenNests.classList.remove("hidden");
  if (name === "profile") ui.screenProfile.classList.remove("hidden");

  closeDrawer();
}

export function openDrawer() {
  ui.drawer.classList.remove("hidden");
  ui.backdrop.classList.remove("hidden");
  ui.drawer.setAttribute("aria-hidden", "false");
}

export function closeDrawer() {
  ui.drawer.classList.add("hidden");
  ui.backdrop.classList.add("hidden");
  ui.drawer.setAttribute("aria-hidden", "true");
}

export function toast(el, text, type = "") {
  el.textContent = text;
  el.classList.remove("hidden", "error", "ok");
  if (type) el.classList.add(type);
  setTimeout(() => el.classList.add("hidden"), 2800);
}

export function setOnlineUI(isOnline) {
  ui.onlinePill.classList.remove("hidden");
  ui.onlineDot.classList.remove("online", "offline");
  ui.onlineDot.classList.add(isOnline ? "online" : "offline");
  ui.onlineText.textContent = isOnline ? "Online" : "Offline";
}

export function setHeaderUser(email) {
  ui.drawerEmail.textContent = email || "—";
}

export function clearNestForm() {
  ui.nestNote.value = "";
  ui.nestSpecies.value = "";
  ui.nestStatus.value = "CATALOGADO";
  ui.nestPhoto.value = "";       // crucial: limpa o file input ao trocar usuário
  state.selectedFile = null;
}

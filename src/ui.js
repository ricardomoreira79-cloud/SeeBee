import { state } from "./state.js";

export const ui = {
  // topbar/drawer
  topbar: document.getElementById("topbar"),
  netBadge: document.getElementById("netBadge"),
  btnMenu: document.getElementById("btnMenu"),
  drawer: document.getElementById("drawer"),
  btnCloseMenu: document.getElementById("btnCloseMenu"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  userEmail: document.getElementById("userEmail"),
  btnLogout: document.getElementById("btnLogout"),

  navHome: document.getElementById("navHome"),
  navInstalacoes: document.getElementById("navInstalacoes"),
  navProfile: document.getElementById("navProfile"),

  // views
  authCard: document.getElementById("authCard"),
  app: document.getElementById("app"),
  viewHome: document.getElementById("viewHome"),
  viewInstalacoes: document.getElementById("viewInstalacoes"),
  viewProfile: document.getElementById("viewProfile"),

  // auth
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  btnLogin: document.getElementById("btnLogin"),
  btnSignup: document.getElementById("btnSignup"),
  btnGoogle: document.getElementById("btnGoogle"),
  authMsg: document.getElementById("authMsg"),

  // home: route/nest
  btnStartRoute: document.getElementById("btnStartRoute"),
  btnFinishRoute: document.getElementById("btnFinishRoute"),
  distance: document.getElementById("distance"),
  nestCount: document.getElementById("nestCount"),
  routeHint: document.getElementById("routeHint"),

  note: document.getElementById("note"),
  status: document.getElementById("status"),
  species: document.getElementById("species"),
  photo: document.getElementById("photo"),
  photoName: document.getElementById("photoName"),
  btnMarkNest: document.getElementById("btnMarkNest"),
  nestMsg: document.getElementById("nestMsg"),
  nestList: document.getElementById("nestList"),

  // instalações
  routesMsg: document.getElementById("routesMsg"),
  routesList: document.getElementById("routesList"),
  routeDetailTitle: document.getElementById("routeDetailTitle"),
  routeNestsMsg: document.getElementById("routeNestsMsg"),
  routeNestsList: document.getElementById("routeNestsList"),

  // profile
  profileEmail: document.getElementById("profileEmail"),
  userType: document.getElementById("userType"),
  btnSaveProfile: document.getElementById("btnSaveProfile"),
  profileMsg: document.getElementById("profileMsg")
};

export function setNetBadge(isOnline) {
  const label = isOnline ? "Online" : "Offline";
  ui.netBadge.classList.toggle("net--online", isOnline);
  ui.netBadge.querySelector(".net__text").textContent = label;
}

export function showMsg(el, text) {
  el.textContent = text;
  el.classList.remove("msg--hidden");
}

export function hideMsg(el) {
  el.textContent = "";
  el.classList.add("msg--hidden");
}

export function openDrawer() {
  ui.drawer.classList.remove("drawer--hidden");
}
export function closeDrawer() {
  ui.drawer.classList.add("drawer--hidden");
}

export function setActiveNav(which) {
  const map = { home: ui.navHome, inst: ui.navInstalacoes, profile: ui.navProfile };
  for (const k of Object.keys(map)) map[k].classList.remove("navItem--active");
  map[which].classList.add("navItem--active");
}

export function showView(which) {
  ui.viewHome.classList.remove("view--active");
  ui.viewInstalacoes.classList.remove("view--active");
  ui.viewProfile.classList.remove("view--active");

  if (which === "home") ui.viewHome.classList.add("view--active");
  if (which === "inst") ui.viewInstalacoes.classList.add("view--active");
  if (which === "profile") ui.viewProfile.classList.add("view--active");
}

export function setLoggedInUI(user) {
  const logged = !!user;

  // auth/app
  ui.authCard.style.display = logged ? "none" : "";
  ui.app.classList.toggle("app--hidden", !logged);

  // topbar só após login
  ui.topbar.classList.toggle("topbar--hidden", !logged);

  // drawer info
  ui.userEmail.textContent = logged ? (user.email || "") : "";

  // perfil
  ui.profileEmail.value = logged ? (user.email || "") : "";
}

export function renderStats() {
  ui.distance.textContent =
    state.route.distanceMeters < 1000
      ? `${Math.round(state.route.distanceMeters)} m`
      : `${(state.route.distanceMeters / 1000).toFixed(2)} km`;

  ui.nestCount.textContent = String(state.nests.count || 0);
}

export function clearNestForm() {
  ui.note.value = "";
  ui.status.value = "CATALOGADO";
  ui.species.value = "";
  ui.photo.value = "";
  ui.photoName.textContent = "";
}

export function renderNestList() {
  ui.nestList.innerHTML = "";

  for (const n of state.nests.list) {
    const div = document.createElement("div");
    div.className = "nestItem";

    if (n.photo_url) {
      const img = document.createElement("img");
      img.src = n.photo_url;
      img.alt = "Foto do ninho";
      div.appendChild(img);
    }

    const meta = document.createElement("div");
    meta.className = "meta";

    const created = n.created_at ? new Date(n.created_at).toLocaleDateString("pt-BR") : "";
    const captured = n.captured_at ? new Date(n.captured_at).toLocaleDateString("pt-BR") : "";

    meta.innerHTML = `
      <div><strong>${n.status || "CATALOGADO"}</strong></div>
      <div>${(n.note || "").slice(0, 40)}</div>
      <div>${n.status === "CAPTURADO" ? `Capturado em: ${captured}` : `Catalogado em: ${created}`}</div>
    `;
    div.appendChild(meta);

    ui.nestList.appendChild(div);
  }
}

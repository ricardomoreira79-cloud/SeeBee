import { state } from "./state.js";

export const ui = {
  netBadge: document.getElementById("netBadge"),
  userEmail: document.getElementById("userEmail"),
  btnLogout: document.getElementById("btnLogout"),

  authCard: document.getElementById("authCard"),
  app: document.getElementById("app"),

  email: document.getElementById("email"),
  password: document.getElementById("password"),
  btnLogin: document.getElementById("btnLogin"),
  btnSignup: document.getElementById("btnSignup"),
  btnGoogle: document.getElementById("btnGoogle"),
  authMsg: document.getElementById("authMsg"),

  btnStartRoute: document.getElementById("btnStartRoute"),
  btnFinishRoute: document.getElementById("btnFinishRoute"),

  distance: document.getElementById("distance"),
  nestCount: document.getElementById("nestCount"),
  routeHint: document.getElementById("routeHint"),

  note: document.getElementById("note"),
  status: document.getElementById("status"),
  photo: document.getElementById("photo"),
  photoName: document.getElementById("photoName"),
  btnMarkNest: document.getElementById("btnMarkNest"),
  nestMsg: document.getElementById("nestMsg"),

  nestList: document.getElementById("nestList")
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

export function setLoggedInUI(user) {
  const logged = !!user;

  ui.authCard.style.display = logged ? "none" : "";
  ui.app.classList.toggle("app--hidden", !logged);

  ui.btnLogout.style.display = logged ? "" : "none";
  ui.userEmail.textContent = logged ? (user.email || "") : "";
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
    meta.innerHTML = `
      <div><strong>${n.status || "CATALOGADO"}</strong></div>
      <div>${(n.note || "").slice(0, 40)}</div>
    `;
    div.appendChild(meta);

    ui.nestList.appendChild(div);
  }
}

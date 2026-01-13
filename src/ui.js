export const ui = {
  // auth
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  btnLogin: document.querySelector("#btnLogin"),
  btnSignup: document.querySelector("#btnSignup"),
  btnGoogle: document.querySelector("#btnGoogle"),
  authMsg: document.querySelector("#authMsg"),

  // topo / drawer
  btnMenu: document.querySelector("#btnMenu"),
  btnCloseDrawer: document.querySelector("#btnCloseDrawer"),
  backdrop: document.querySelector("#backdrop"),
  drawer: document.querySelector("#drawer"),
  btnLogout: document.querySelector("#btnLogout"),
  onlinePill: document.querySelector("#onlinePill"),
  onlineDot: document.querySelector("#onlineDot"),
  onlineText: document.querySelector("#onlineText"),

  // telas
  screenLogin: document.querySelector("#screenLogin"),
  screenHome: document.querySelector("#screenHome"),
  screenTrails: document.querySelector("#screenTrails"),
  screenNests: document.querySelector("#screenNests"),
  screenProfile: document.querySelector("#screenProfile"),

  // trilha
  btnStartRoute: document.querySelector("#btnStartRoute"),
  btnFinishRoute: document.querySelector("#btnFinishRoute"),
  distanceText: document.querySelector("#distanceText"),
  nestsCountText: document.querySelector("#nestsCountText"),
  routeHint: document.querySelector("#routeHint"),

  // ninho
  nestNote: document.querySelector("#nestNote"),
  nestStatus: document.querySelector("#nestStatus"),
  nestSpecies: document.querySelector("#nestSpecies"),
  nestPhoto: document.querySelector("#nestPhoto"),
  btnMarkNest: document.querySelector("#btnMarkNest"),
  nestMsg: document.querySelector("#nestMsg"),

  // listas
  trailsList: document.querySelector("#trailsList"),
  trailsEmpty: document.querySelector("#trailsEmpty"),
  allNestsList: document.querySelector("#allNestsList"),
  nestsEmpty: document.querySelector("#nestsEmpty"),

  // perfil (por enquanto mínimo, depois expandimos)
  p_email: document.querySelector("#p_email"),
};

export function toast(el, msg, type = "ok") {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  el.dataset.type = type;

  // some rápido (aprox 2.5s)
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.add("hidden");
  }, 2500);
}

export function showScreen(name) {
  const all = ["login", "home", "trails", "nests", "profile"];
  all.forEach(k => {
    const el = ui[`screen${k.charAt(0).toUpperCase() + k.slice(1)}`];
    if (el) el.classList.add("hidden");
  });

  const target = ui[`screen${name.charAt(0).toUpperCase() + name.slice(1)}`];
  if (target) target.classList.remove("hidden");
}

export function openDrawer() {
  ui.drawer.classList.add("open");
  ui.backdrop.classList.remove("hidden");
}

export function closeDrawer() {
  ui.drawer.classList.remove("open");
  ui.backdrop.classList.add("hidden");
}

/**
 * Online só após login:
 * - hide=true => esconde o pill
 */
export function setOnlineUI(isOnline, hide = false) {
  if (!ui.onlinePill) return;
  ui.onlinePill.classList.toggle("hidden", !!hide);

  if (hide) return;

  ui.onlineDot.classList.toggle("dotOnline", !!isOnline);
  ui.onlineDot.classList.toggle("dotOffline", !isOnline);
  ui.onlineText.textContent = isOnline ? "Online" : "Offline";
}

export function clearNestForm() {
  ui.nestNote.value = "";
  ui.nestSpecies.value = "";
  ui.nestStatus.value = "CATALOGADO";
  ui.nestPhoto.value = "";
}

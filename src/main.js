import { getSession, signIn, signUp, signOut } from "./auth.js";
import { supabase } from "./supabaseClient.js";
import { createRoute, appendPoint } from "./routes.js";
import { createNest, createPhotoRow } from "./nests.js";
import { uploadNestPhoto } from "./storage.js";

const $ = (sel) => document.querySelector(sel);

const authScreen = $("#authScreen");
const appScreen = $("#appScreen");

const loginEmail = $("#loginEmail");
const loginPass = $("#loginPass");
const btnLogin = $("#btnLogin");
const btnSignup = $("#btnSignup");
const authMsg = $("#authMsg");

const userEmailEl = $("#userEmail");
const btnLogout = $("#btnLogout");

const btnStartRoute = $("#btnStartRoute");
const btnFinishRoute = $("#btnFinishRoute");
const routeMsg = $("#routeMsg");

const statDistance = $("#statDistance");
const statPos = $("#statPos");

const nestObs = $("#nestObs");
const nestStatus = $("#nestStatus");
const nestPhoto = $("#nestPhoto");
const btnMarkNest = $("#btnMarkNest");
const nestMsg = $("#nestMsg");

let map;
let meMarker;
let routeId = null;
let watchId = null;

let lastPos = null;
let totalDistance = 0;

function setMsg(el, text, ok = false) {
  el.textContent = text || "";
  el.classList.toggle("ok", !!ok);
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function ensureMap(lat, lng) {
  if (map) return;
  map = L.map("map", { zoomControl: true }).setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  meMarker = L.marker([lat, lng]).addTo(map).bindPopup("Você").openPopup();
}

function updateMe(lat, lng) {
  ensureMap(lat, lng);
  meMarker.setLatLng([lat, lng]);
  map.setView([lat, lng], map.getZoom());
  statPos.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

async function refreshAuthUI() {
  const session = await getSession();
  const logged = !!session?.user;

  authScreen.classList.toggle("hidden", logged);
  appScreen.classList.toggle("hidden", !logged);

  if (logged) {
    userEmailEl.textContent = session.user.email || "";
    btnLogout.disabled = false;
  } else {
    userEmailEl.textContent = "";
    btnLogout.disabled = true;
  }

  return session;
}

async function startGeolocation() {
  if (!navigator.geolocation) {
    setMsg(routeMsg, "Geolocalização não suportada neste navegador.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      updateMe(lat, lng);

      const now = { t: new Date().toISOString(), lat, lng };

      if (lastPos) {
        totalDistance += haversine(lastPos, { lat, lng });
      }
      lastPos = { lat, lng };
      statDistance.textContent = `${Math.round(totalDistance)} m`;

      // se estiver em trajeto, salva pontos
      if (routeId) {
        try {
          await appendPoint(routeId, now);
        } catch (e) {
          console.warn("Falha ao anexar ponto:", e?.message || e);
        }
      }
    },
    (err) => {
      setMsg(routeMsg, `Erro na geolocalização: ${err.message}`);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
}

function stopGeolocation() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

btnLogin.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    await signIn(loginEmail.value.trim(), loginPass.value);
    await refreshAuthUI();
    await startGeolocation();
  } catch (e) {
    setMsg(authMsg, e.message || String(e));
  }
});

btnSignup.addEventListener("click", async () => {
  setMsg(authMsg, "");
  try {
    await signUp(loginEmail.value.trim(), loginPass.value);
    setMsg(authMsg, "Conta criada! Agora faça login.", true);
  } catch (e) {
    setMsg(authMsg, e.message || String(e));
  }
});

btnLogout.addEventListener("click", async () => {
  try {
    await signOut();
  } finally {
    routeId = null;
    btnFinishRoute.disabled = true;
    btnMarkNest.disabled = true;
    stopGeolocation();
    await refreshAuthUI();
  }
});

btnStartRoute.addEventListener("click", async () => {
  setMsg(routeMsg, "");
  try {
    const session = await getSession();
    if (!session?.user) throw new Error("Você precisa estar logado.");

    if (!lastPos) throw new Error("Aguardando localização... dê alguns segundos e tente novamente.");

    const name = `Trajeto em ${new Date().toLocaleString("pt-BR")}`;
    const r = await createRoute({
      userId: session.user.id,
      name,
      startLat: lastPos.lat,
      startLng: lastPos.lng,
    });

    routeId = r.id;
    btnFinishRoute.disabled = false;
    btnMarkNest.disabled = false;

    setMsg(routeMsg, `Trajeto iniciado: ${routeId}`, true);
  } catch (e) {
    setMsg(routeMsg, e.message || String(e));
  }
});

btnFinishRoute.addEventListener("click", async () => {
  routeId = null;
  btnFinishRoute.disabled = true;
  btnMarkNest.disabled = true;
  setMsg(routeMsg, "Trajeto finalizado.", true);
});

btnMarkNest.addEventListener("click", async () => {
  setMsg(nestMsg, "");
  try {
    const session = await getSession();
    if (!session?.user) throw new Error("Você precisa estar logado.");
    if (!lastPos) throw new Error("Sem posição. Aguarde a geolocalização.");

    if (!routeId) throw new Error("Inicie um trajeto primeiro.");

    // 1) cria ninho no banco
    const nest = await createNest({
      userId: session.user.id,
      routeId,
      lat: lastPos.lat,
      lng: lastPos.lng,
      status: nestStatus.value,
      notes: nestObs.value.trim(),
    });

    // coloca marker
    L.marker([lastPos.lat, lastPos.lng]).addTo(map).bindPopup(`Ninho: ${nest.id}`).openPopup();

    // 2) upload foto (se tiver)
    const file = nestPhoto.files?.[0];
    if (file) {
      const up = await uploadNestPhoto({ userId: session.user.id, nestId: nest.id, file });
      await createPhotoRow({ userId: session.user.id, nestId: nest.id, path: up.path });
      setMsg(nestMsg, `Ninho salvo com foto.`, true);
    } else {
      setMsg(nestMsg, `Ninho salvo (sem foto).`, true);
    }

    // limpa
    nestObs.value = "";
    nestPhoto.value = "";
  } catch (e) {
    setMsg(nestMsg, e.message || String(e));
  }
});

async function init() {
  const session = await refreshAuthUI();

  // Reage a mudanças no login
  supabase.auth.onAuthStateChange(async () => {
    await refreshAuthUI();
  });

  if (session?.user) {
    await startGeolocation();
  }
}

init();

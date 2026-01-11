import { supabase } from "./supabaseClient.js";
import { listMyNests, createNest, uploadNestPhoto } from "./nests.js";

const els = {
  authPanel: document.getElementById("authPanel"),
  appPanel: document.getElementById("appPanel"),

  email: document.getElementById("email"),
  password: document.getElementById("password"),
  btnLogin: document.getElementById("btnLogin"),
  btnSignup: document.getElementById("btnSignup"),
  authMsg: document.getElementById("authMsg"),

  userEmail: document.getElementById("userEmail"),
  btnLogout: document.getElementById("btnLogout"),

  btnStartRoute: document.getElementById("btnStartRoute"),
  btnFinishRoute: document.getElementById("btnFinishRoute"),
  routeMsg: document.getElementById("routeMsg"),
  distance: document.getElementById("distance"),
  lastPos: document.getElementById("lastPos"),
  routeNestsCount: document.getElementById("routeNestsCount"),

  nestNotes: document.getElementById("nestNotes"),
  nestStatus: document.getElementById("nestStatus"),
  nestPhoto: document.getElementById("nestPhoto"),
  btnMarkNest: document.getElementById("btnMarkNest"),
  nestMsg: document.getElementById("nestMsg"),

  nestsList: document.getElementById("nestsList"),
  btnRefresh: document.getElementById("btnRefresh"),
};

function setMsg(el, text = "", type = "") {
  el.textContent = text || "";
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
}

function formatLatLng(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return "—";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** ===============================
 *  MAPA + POSIÇÃO
 * =============================== */
let map, marker;
let selectedLatLng = null;

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([-15.60, -56.10], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  marker = L.marker([-15.60, -56.10], { draggable: true }).addTo(map);

  marker.on("dragend", () => {
    const ll = marker.getLatLng();
    selectedLatLng = { lat: ll.lat, lng: ll.lng };
    setMsg(els.nestMsg, `Posição do próximo ninho: ${formatLatLng(ll.lat, ll.lng)}`, "");
  });

  map.on("click", (e) => {
    const ll = e.latlng;
    marker.setLatLng(ll);
    selectedLatLng = { lat: ll.lat, lng: ll.lng };
    setMsg(els.nestMsg, `Posição do próximo ninho: ${formatLatLng(ll.lat, ll.lng)}`, "");
  });
}

let watchId = null;
let lastPoint = null;
let currentRoute = null; // registro da tabela routes
let routePoints = []; // array de pontos {t, lat, lng}
let routeNests = 0;

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(q));
}

function startWatchPosition() {
  if (!("geolocation" in navigator)) {
    setMsg(els.routeMsg, "Geolocalização não disponível neste dispositivo/navegador.", "err");
    return;
  }

  if (watchId) navigator.geolocation.clearWatch(watchId);

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      els.lastPos.textContent = formatLatLng(lat, lng);

      // move mapa suavemente na primeira leitura, depois só atualiza
      if (!lastPoint) {
        map.setView([lat, lng], 16);
        marker.setLatLng([lat, lng]);
        selectedLatLng = { lat, lng };
      }

      const point = { t: new Date().toISOString(), lat, lng };
      if (currentRoute) {
        routePoints.push(point);
      }

      // distância
      if (lastPoint && currentRoute) {
        const d = haversineMeters(lastPoint, point);
        const current = parseFloat((els.distance.textContent || "0").replace(" m", "")) || 0;
        els.distance.textContent = `${Math.round(current + d)} m`;
      }
      lastPoint = point;
    },
    (err) => {
      setMsg(els.routeMsg, `Erro ao obter localização: ${err.message}`, "err");
    },
    { enableHighAccuracy: true, maximumAge: 2500, timeout: 10000 }
  );
}

function stopWatchPosition() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** ===============================
 *  AUTH
 * =============================== */
async function refreshSessionUI() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    els.authPanel.classList.remove("hidden");
    els.appPanel.classList.add("hidden");
    els.userEmail.textContent = "—";
    return;
  }

  els.authPanel.classList.add("hidden");
  els.appPanel.classList.remove("hidden");
  els.userEmail.textContent = session.user.email || session.user.id;

  // iniciar mapa se ainda não
  if (!map) initMap();

  // iniciar GPS
  startWatchPosition();

  // carregar lista
  await loadNests();
}

els.btnLogin.addEventListener("click", async () => {
  setMsg(els.authMsg, "Entrando...", "");
  const email = els.email.value.trim();
  const password = els.password.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setMsg(els.authMsg, error.message, "err");

  setMsg(els.authMsg, "OK!", "ok");
  await refreshSessionUI();
});

els.btnSignup.addEventListener("click", async () => {
  setMsg(els.authMsg, "Criando conta...", "");
  const email = els.email.value.trim();
  const password = els.password.value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return setMsg(els.authMsg, error.message, "err");

  setMsg(els.authMsg, "Conta criada! Se necessário, confirme o e-mail.", "ok");
});

els.btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  // reset route local
  currentRoute = null;
  routePoints = [];
  routeNests = 0;
  els.distance.textContent = "0 m";
  els.routeNestsCount.textContent = "0";
  setMsg(els.routeMsg, "");
  stopWatchPosition();
  await refreshSessionUI();
});

// Listener de mudança de sessão
supabase.auth.onAuthStateChange(async () => {
  await refreshSessionUI();
});

/** ===============================
 *  ROUTES (trajetos) — tabela public.routes
 * Seu schema (pelo print) tem:
 * - id uuid
 * - name text
 * - created_at timestamptz
 * - path jsonb
 * - traps jsonb
 *
 * Vamos usar:
 * - name: texto
 * - path: array de pontos [{t,lat,lng}]
 * - traps: array de "ninhos marcados no trajeto" (mínimo)
 * =============================== */

els.btnStartRoute.addEventListener("click", async () => {
  setMsg(els.routeMsg, "");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return setMsg(els.routeMsg, "Você precisa estar logado.", "err");

  // cria novo route
  const name = prompt("Nome do trajeto:", `Trajeto ${new Date().toLocaleString("pt-BR")}`) || "";
  if (!name.trim()) return;

  routePoints = [];
  routeNests = 0;
  els.routeNestsCount.textContent = "0";
  els.distance.textContent = "0 m";
  lastPoint = null;

  const payload = {
    name: name.trim(),
    path: [],
    traps: [],
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select()
    .single();

  if (error) return setMsg(els.routeMsg, `Erro ao criar trajeto: ${error.message}`, "err");

  currentRoute = data;
  els.btnStartRoute.disabled = true;
  els.btnFinishRoute.disabled = false;

  setMsg(els.routeMsg, `Trajeto iniciado: "${currentRoute.name}"`, "ok");
});

els.btnFinishRoute.addEventListener("click", async () => {
  setMsg(els.routeMsg, "");

  if (!currentRoute) return setMsg(els.routeMsg, "Nenhum trajeto em andamento.", "err");

  // atualizar route com path + traps (mínimo)
  const payload = {
    path: routePoints,
    traps: (currentRoute.traps || []),
  };

  const { error } = await supabase
    .from("routes")
    .update(payload)
    .eq("id", currentRoute.id);

  if (error) return setMsg(els.routeMsg, `Erro ao finalizar trajeto: ${error.message}`, "err");

  setMsg(els.routeMsg, "Trajeto finalizado e salvo.", "ok");

  currentRoute = null;
  routePoints = [];
  routeNests = 0;
  els.routeNestsCount.textContent = "0";
  els.btnStartRoute.disabled = false;
  els.btnFinishRoute.disabled = true;
});

/** ===============================
 *  NESTS (marcar ninho)
 * =============================== */
els.btnMarkNest.addEventListener("click", async () => {
  setMsg(els.nestMsg, "");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return setMsg(els.nestMsg, "Você precisa estar logado.", "err");

  // posição escolhida: se não clicou, usa lastPoint
  const lat = selectedLatLng?.lat ?? lastPoint?.lat;
  const lng = selectedLatLng?.lng ?? lastPoint?.lng;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return setMsg(els.nestMsg, "Sem posição válida. Ative o GPS ou clique no mapa.", "err");
  }

  const notes = els.nestNotes.value.trim();
  const status = els.nestStatus.value;

  // 1) upload foto (se houver)
  const file = els.nestPhoto.files?.[0] || null;

  setMsg(els.nestMsg, file ? "Enviando foto..." : "Salvando ninho...", "");

  let photoUrl = null;

  if (file) {
    const up = await uploadNestPhoto({ user: session.user, file });
    if (up.error) {
      // mantém o comportamento do seu app: salva o ninho sem foto
      setMsg(
        els.nestMsg,
        `Não foi possível enviar a foto. O ninho será salvo sem foto. (${up.error.message})`,
        "err"
      );
    } else {
      photoUrl = up.publicUrl;
      setMsg(els.nestMsg, "Foto enviada. Salvando ninho...", "");
    }
  }

  // 2) cria ninho no banco
  const { data, error } = await createNest({
    userId: session.user.id,
    lat,
    lng,
    notes,
    status,
    trailId: null, // você pode ligar a trails depois
    photoUrl,
  });

  if (error) return setMsg(els.nestMsg, `Erro ao salvar ninho: ${error.message}`, "err");

  // 3) se trajeto ativo, registra mínimo em routes.traps
  if (currentRoute) {
    try {
      const traps = Array.isArray(currentRoute.traps) ? currentRoute.traps : [];
      traps.push({
        t: new Date().toISOString(),
        nest_id: data.id,
        lat,
        lng,
        status,
        notes: notes || null,
        photo_url: photoUrl || null,
      });

      const { error: upRouteErr } = await supabase
        .from("routes")
        .update({ traps })
        .eq("id", currentRoute.id);

      if (!upRouteErr) {
        currentRoute.traps = traps;
        routeNests += 1;
        els.routeNestsCount.textContent = String(routeNests);
      }
    } catch (e) {
      // não bloqueia o fluxo
    }
  }

  els.nestNotes.value = "";
  els.nestPhoto.value = "";
  setMsg(els.nestMsg, `Ninho salvo ✅ (${formatLatLng(lat, lng)})`, "ok");

  await loadNests();
});

els.btnRefresh.addEventListener("click", loadNests);

async function loadNests() {
  els.nestsList.innerHTML = "";
  const { data, error } = await listMyNests(50);
  if (error) {
    els.nestsList.innerHTML = `<div class="item"><div class="item__meta">Erro: ${escapeHtml(error.message)}</div></div>`;
    return;
  }
  if (!data?.length) {
    els.nestsList.innerHTML = `<div class="item"><div class="item__meta">Nenhum ninho ainda.</div></div>`;
    return;
  }

  // render
  els.nestsList.innerHTML = data.map(renderNest).join("");
}

function renderNest(n) {
  const when = new Date(n.created_at).toLocaleString("pt-BR");
  const pos = formatLatLng(n.lat, n.lng);
  const notes = n.notes ? escapeHtml(n.notes) : "—";

  // se você tiver uma coluna de foto em public.nests (ex: photo_url),
  // renderize aqui também. Como não sabemos seu schema final, deixo só o texto.
  return `
    <div class="item">
      <div class="item__top">
        <div><strong>${escapeHtml(n.title || "Ninho")}</strong></div>
        <div class="badge">${escapeHtml(n.status || "—")}</div>
      </div>
      <div class="item__meta">
        <div><strong>Data:</strong> ${escapeHtml(when)}</div>
        <div><strong>Posição:</strong> ${escapeHtml(pos)}</div>
        <div><strong>Obs:</strong> ${notes}</div>
      </div>
      <button class="btn btn--ghost" onclick="window.__focusNest(${n.lat}, ${n.lng})">Ver no mapa</button>
    </div>
  `;
}

window.__focusNest = (lat, lng) => {
  if (!map) return;
  map.setView([lat, lng], 17);
  marker.setLatLng([lat, lng]);
  selectedLatLng = { lat, lng };
};

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** boot */
(async function boot() {
  // PWA basic
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (e) {
      // ignore
    }
  }
  await refreshSessionUI();
})();

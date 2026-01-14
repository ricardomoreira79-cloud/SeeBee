import { state } from "./state.js";
import { ui, openNestModal } from "./ui.js";
import { persistLocalRoutes, loadLocalRoutes } from "./storage.js";
import { supabaseClient } from "./auth.js";
import { updateUserMarker, clearMapLayers, drawRouteOnMap } from "./map.js";
import { openPhotoModal } from "./ui.js";

export function calculateTotalDistance(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const c = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * d;
}

export function startRoute() {
  if (!navigator.geolocation) {
    alert("Seu dispositivo não suporta GPS.");
    return;
  }

  state.currentRoute = {
    id: null,
    name: "",
    created_at: new Date().toISOString(),
    path: [],
    nests: [],
    totalDistance: 0,
    synced: state.isOnline,
  };

  clearMapLayers();

  state.pathLayer = L.polyline([], { color: "#22c55e", weight: 4 }).addTo(state.map);

  ui.btnAddNest.disabled = false;
  ui.badgeStatus.textContent = "Gravando";
  ui.badgeStatus.style.background = "#14532d";
  ui.btnToggleText.textContent = "Finalizar trajeto";
  ui.btnToggleIcon.textContent = "⏹";

  ui.infoRouteName.textContent = "Trajeto: em gravação...";
  ui.infoDistance.textContent = "Distância: 0 m";
  ui.infoNests.textContent = "Ninhos: 0";

  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const point = { lat: latitude, lng: longitude, t: new Date().toISOString() };
      state.currentRoute.path.push(point);

      updateUserMarker(latitude, longitude);
      state.pathLayer.addLatLng([latitude, longitude]);

      const d = calculateTotalDistance(state.currentRoute.path);
      state.currentRoute.totalDistance = d;

      ui.infoDistance.textContent = "Distância: " + d.toFixed(d > 1000 ? 1 : 0) + " m";
      ui.infoGps.textContent = "GPS: acompanhando...";

      state.map.panTo([latitude, longitude], { animate: true });
    },
    (error) => {
      console.error(error);
      ui.infoGps.textContent = "GPS: erro ao ler posição";
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}

export async function stopRoute() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }

  ui.btnAddNest.disabled = true;
  ui.badgeStatus.textContent = "Parado";
  ui.badgeStatus.style.background = "#022c22";
  ui.btnToggleText.textContent = "Iniciar trajeto";
  ui.btnToggleIcon.textContent = "▶";

  const route = state.currentRoute;
  state.currentRoute = null;

  if (!route || route.path.length < 2) {
    alert("Poucos pontos registrados. O trajeto foi descartado.");
    clearMapLayers();
    ui.infoRouteName.textContent = "Trajeto: —";
    ui.infoDistance.textContent = "Distância: 0 m";
    ui.infoNests.textContent = "Ninhos: 0";
    return;
  }

  const now = new Date();
  const defaultName =
    `Trajeto em ${now.toLocaleDateString("pt-BR")} ` +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const name = prompt("Dê um nome para este trajeto:", defaultName);
  route.name = name || defaultName;

  ui.infoRouteName.textContent = "Trajeto: " + route.name;

  await saveRoute(route);
}

export async function handleAddNest() {
  if (!state.currentRoute || state.currentRoute.path.length === 0) {
    alert("Comece o trajeto antes de marcar um ninho.");
    return;
  }

  const lastPoint = state.currentRoute.path[state.currentRoute.path.length - 1];
  const modalResult = await openNestModal();
  if (!modalResult) return;

  const { description, file } = modalResult;
  let photoUrl = null;

  if (file) {
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `ninho-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      if (state.isOnline) {
        const { error: uploadError } = await supabaseClient.storage
          .from("ninhos-fotos")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) {
          console.error(uploadError);
          alert("Não foi possível enviar a foto. O ninho será salvo sem foto.");
        } else {
          const { data: publicData } = supabaseClient.storage
            .from("ninhos-fotos")
            .getPublicUrl(filePath);
          photoUrl = publicData.publicUrl;
        }
      } else {
        alert("Você está offline. Por enquanto, o ninho será salvo sem foto.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar a foto. O ninho será salvo mesmo assim.");
    }
  }

  const nest = {
    lat: lastPoint.lat,
    lng: lastPoint.lng,
    description: description || "",
    photoUrl,
    created_at: new Date().toISOString(),
  };

  state.currentRoute.nests.push(nest);
  ui.infoNests.textContent = "Ninhos: " + state.currentRoute.nests.length;

  const marker = L.marker([nest.lat, nest.lng]).addTo(state.nestsLayerGroup);

  if (photoUrl) {
    marker.bindPopup(
      `<div style="font-size:12px">
        <strong>Ninho</strong><br>
        <img src="${photoUrl}" style="max-width:120px;border-radius:8px;margin-top:6px;display:block"/>
        <div style="margin-top:6px">${nest.description || ""}</div>
      </div>`
    );

    marker.on("popupopen", () => {
      const img = document.querySelector(`img[src="${photoUrl}"]`);
      if (img) img.style.cursor = "pointer";
      if (img) img.onclick = () => openPhotoModal(photoUrl);
    });
  } else {
    marker.bindPopup(
      `<div style="font-size:12px"><strong>Ninho</strong><br>${nest.description || "Sem observações."}</div>`
    );
  }
}

async function loadCloudRoutes() {
  if (!state.isOnline) return [];
  try {
    const { data, error } = await supabaseClient
      .from("routes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      path: row.path || [],
      nests: row.traps || [],
      totalDistance: calculateTotalDistance(row.path || []),
      synced: true,
    }));
  } catch (e) {
    console.error(e);
    ui.cloudStatus.textContent = "Erro ao ler dados da nuvem (usando dados locais).";
    return [];
  }
}

export async function syncRoutes() {
  const local = loadLocalRoutes();

  if (state.isOnline) {
    for (const r of local) {
      if (!r.id) {
        try {
          const { data, error } = await supabaseClient
            .from("routes")
            .insert({ name: r.name, path: r.path, traps: r.nests })
            .select()
            .single();

          if (!error && data) {
            r.id = data.id;
            r.synced = true;
          }
        } catch (e) {
          console.error("Erro ao sincronizar trajeto offline:", e);
        }
      }
    }
  }

  const cloud = await loadCloudRoutes();

  let merged = [];
  if (state.isOnline) {
    merged = [...cloud];
    for (const r of local) {
      if (!r.id) merged.push(r);
      else if (!merged.some((c) => c.id === r.id)) merged.push(r);
    }
  } else {
    merged = [...local];
  }

  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  state.allRoutes = merged;
  persistLocalRoutes(state.allRoutes);
}

export async function saveRoute(route) {
  state.allRoutes.unshift(route);
  persistLocalRoutes(state.allRoutes);

  if (!state.isOnline) {
    ui.cloudStatus.textContent = "Trabalhando offline – trajeto salvo neste aparelho";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("routes")
      .insert({ name: route.name, path: route.path, traps: route.nests })
      .select()
      .single();

    if (error) {
      console.error(error);
      ui.cloudStatus.textContent = "Erro ao salvar na nuvem (mantendo cópia local).";
      return;
    }

    route.id = data.id;
    route.synced = true;
    ui.cloudStatus.textContent = "Trabalhando online";
    persistLocalRoutes(state.allRoutes);
  } catch (e) {
    console.error(e);
    ui.cloudStatus.textContent = "Erro ao salvar na nuvem (mantendo cópia local).";
  }
}

export function renderRoutesList() {
  ui.routesList.innerHTML = "";

  if (!state.allRoutes.length) {
    const div = document.createElement("div");
    div.className = "route-empty";
    div.textContent = "Nenhum trajeto salvo ainda. Finalize um trajeto para ele aparecer aqui.";
    ui.routesList.appendChild(div);
    return;
  }

  state.allRoutes.forEach((route, index) => {
    const card = document.createElement("div");
    card.className = "route-card";

    const main = document.createElement("div");
    main.className = "route-main";

    const strong = document.createElement("strong");
    strong.textContent = route.name || "Trajeto sem nome";
    main.appendChild(strong);

    const meta = document.createElement("div");
    meta.className = "route-meta";

    const date = new Date(route.created_at || Date.now());
    const dist = (route.totalDistance || 0).toFixed((route.totalDistance || 0) > 1000 ? 1 : 0);

    meta.textContent =
      `${date.toLocaleDateString("pt-BR")} · ` +
      `${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ` +
      `${dist} m · ${route.nests?.length || 0} ninhos`;

    if (!route.id) {
      const span = document.createElement("span");
      span.textContent = " · não sincronizado";
      span.style.color = "#facc15";
      meta.appendChild(span);
    }

    main.appendChild(meta);

    if (route.nests?.length) {
      const thumbsRow = document.createElement("div");
      thumbsRow.className = "thumbs-row";

      route.nests.forEach((nest) => {
        if (!nest.photoUrl) return;
        const img = document.createElement("img");
        img.src = nest.photoUrl;
        img.className = "thumb";
        img.addEventListener("click", () => openPhotoModal(nest.photoUrl));
        thumbsRow.appendChild(img);
      });

      if (thumbsRow.childElementCount) main.appendChild(thumbsRow);
    }

    const actions = document.createElement("div");
    actions.className = "route-actions";

    const btnVer = document.createElement("button");
    btnVer.className = "btn-xs";
    btnVer.textContent = "Ver no mapa";
    btnVer.addEventListener("click", () => drawRouteOnMap(route));
    actions.appendChild(btnVer);

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-xs";
    btnEdit.textContent = "Renomear";
    btnEdit.addEventListener("click", () => renameRoute(index, route));
    actions.appendChild(btnEdit);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-xs danger";
    btnDelete.textContent = "Excluir";
    btnDelete.addEventListener("click", () => deleteRoute(index, route));
    actions.appendChild(btnDelete);

    card.appendChild(main);
    card.appendChild(actions);

    ui.routesList.appendChild(card);
  });
}

async function renameRoute(index, route) {
  const newName = prompt("Novo nome para o trajeto:", route.name);
  if (!newName || newName === route.name) return;

  route.name = newName;
  state.allRoutes[index] = route;
  persistLocalRoutes(state.allRoutes);
  renderRoutesList();

  if (route.id && state.isOnline) {
    try {
      await supabaseClient.from("routes").update({ name: newName }).eq("id", route.id);
    } catch (e) {
      console.error(e);
    }
  }
}

async function deleteRoute(index, route) {
  if (!confirm("Tem certeza que deseja excluir este trajeto?")) return;

  state.allRoutes.splice(index, 1);
  persistLocalRoutes(state.allRoutes);
  renderRoutesList();

  if (route.id && state.isOnline) {
    try {
      await supabaseClient.from("routes").delete().eq("id", route.id);
    } catch (e) {
      console.error(e);
    }
  }
}

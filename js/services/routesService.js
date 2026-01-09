import { supabaseClient } from "./supabaseClient.js";
import { loadLocalRoutes, saveLocalRoutes } from "./storageService.js";
import { idbGetPhoto, idbDeletePhoto } from "./idbService.js";
import { state } from "../state.js";

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
  return 2 * R * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function calcDistance(path = []) {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversine(path[i - 1], path[i]);
  return total;
}

export function loadLocalIntoState() {
  const local = loadLocalRoutes();
  state.allRoutes = (local || []).map(r => ({
    ...r,
    totalDistance: r.totalDistance ?? calcDistance(r.path || []),
  }));
}

export function persistStateRoutes() {
  saveLocalRoutes(state.allRoutes);
}

export async function loadCloudRoutes() {
  if (!state.isOnline) return [];

  const { data, error } = await supabaseClient
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    path: row.path || [],
    nests: row.traps || [],
    totalDistance: calcDistance(row.path || []),
    synced: true,
  }));
}

async function uploadNestPhotoToSupabase(fileOrBlob) {
  const ext = "jpg";
  const filePath = `ninho-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("ninhos-fotos")
    .upload(filePath, fileOrBlob, { contentType: "image/jpeg" });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabaseClient
    .storage
    .from("ninhos-fotos")
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

export async function saveRoute(route) {
  // salva local sempre
  state.allRoutes.unshift(route);
  persistStateRoutes();

  // se offline: não sobe agora
  if (!state.isOnline) return route;

  // online: sobe agora (route + fotos que estiverem pendentes)
  const prepared = await ensureRoutePhotosOnline(route);

  const { data, error } = await supabaseClient
    .from("routes")
    .insert({
      name: prepared.name,
      path: prepared.path,
      traps: prepared.nests,
    })
    .select()
    .single();

  if (error) throw error;

  prepared.id = data.id;
  prepared.synced = true;

  // atualiza no state
  state.allRoutes = state.allRoutes.map(r => (r.created_at === route.created_at ? prepared : r));
  persistStateRoutes();

  return prepared;
}

async function ensureRoutePhotosOnline(route) {
  // Se tiver ninhos com photoLocalKey (IDB), tenta subir e trocar por photoUrl
  const updated = structuredClone(route);

  if (!state.isOnline) return updated;

  for (const nest of (updated.nests || [])) {
    if (nest.photoUrl) continue;

    if (nest.photoLocalKey) {
      const photo = await idbGetPhoto(nest.photoLocalKey);
      if (photo?.blob) {
        try {
          const url = await uploadNestPhotoToSupabase(photo.blob);
          nest.photoUrl = url;
          await idbDeletePhoto(nest.photoLocalKey);
          delete nest.photoLocalKey;
        } catch {
          // mantém pendente, tenta depois
        }
      }
    }
  }

  return updated;
}

export async function syncRoutes() {
  // 1) carrega local
  const local = loadLocalRoutes() || [];

  // 2) se online: sobe rotas sem id (criada offline) + tenta subir fotos pendentes
  if (state.isOnline) {
    for (const r of local) {
      // tenta “resolver fotos” antes de subir/atualizar
      const fixed = await ensureRoutePhotosOnline(r);

      // sem id => insert
      if (!fixed.id) {
        try {
          const { data, error } = await supabaseClient
            .from("routes")
            .insert({ name: fixed.name, path: fixed.path, traps: fixed.nests })
            .select()
            .single();

          if (!error && data) {
            fixed.id = data.id;
            fixed.synced = true;
          }
        } catch {
          // permanece offline pendente
        }
      } else {
        // já tem id: se ainda tem pendências de foto, atualiza a rota na nuvem
        const hasPending = (fixed.nests || []).some(n => n.photoLocalKey && !n.photoUrl);
        const changed = JSON.stringify(fixed) !== JSON.stringify(r);
        if (!hasPending && changed) {
          try {
            await supabaseClient
              .from("routes")
              .update({ name: fixed.name, path: fixed.path, traps: fixed.nests })
              .eq("id", fixed.id);
          } catch {}
        }
      }

      // sincroniza no array local
      Object.assign(r, fixed);
    }
  }

  // 3) cloud
  let cloud = [];
  if (state.isOnline) {
    try {
      cloud = await loadCloudRoutes();
    } catch {
      cloud = [];
    }
  }

  // 4) merge
  const merged = [];

  if (state.isOnline) {
    merged.push(...cloud);
    for (const r of local) {
      if (!r.id) {
        merged.push({
          ...r,
          totalDistance: r.totalDistance ?? calcDistance(r.path || []),
        });
      } else if (!merged.some(c => c.id === r.id)) {
        merged.push({
          ...r,
          totalDistance: r.totalDistance ?? calcDistance(r.path || []),
        });
      }
    }
  } else {
    merged.push(...local.map(r => ({
      ...r,
      totalDistance: r.totalDistance ?? calcDistance(r.path || []),
    })));
  }

  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  state.allRoutes = merged;
  persistStateRoutes();
}
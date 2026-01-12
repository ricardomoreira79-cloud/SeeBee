import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { uploadNestPhoto } from "./storage.js";

export async function insertNest({ routeId, lat, lng, status, note, species, file }) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");
  if (!routeId) throw new Error("Inicie um trajeto antes de marcar o ninho.");

  let photo_path = null;
  let photo_url = null;

  if (file) {
    const up = await uploadNestPhoto(file, routeId);
    photo_path = up.path;
    photo_url = up.publicUrl;
  }

  const payload = {
    user_id: user.id,
    route_id: routeId,
    lat,
    lng,
    status,
    note: note || null,
    species: species || null,
    captured_at: status === "CAPTURADO" ? new Date().toISOString() : null,
    photo_path,
    photo_url
  };

  const { data, error } = await supabase
    .from("nests")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNestsByRoute(routeId) {
  const user = state.user;
  if (!user || !routeId) return [];

  const { data, error } = await supabase
    .from("nests")
    .select("id,status,note,species,photo_url,lat,lng,created_at,captured_at")
    .eq("route_id", routeId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateNestCaptured(nestId, { status, species } = {}) {
  const payload = {
    status: status || "CAPTURADO",
    species: species || null,
    captured_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("nests")
    .update(payload)
    .eq("id", nestId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

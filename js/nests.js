import { state } from "./state.js";
import { uploadPublic } from "./storage.js";

export async function createNest(supabase, payload) {
  if (!state.user) throw new Error("Usuário não autenticado.");
  if (!payload?.route_id) throw new Error("Trilha não iniciada.");
  if (payload.lat == null || payload.lng == null) throw new Error("Sem posição GPS.");

  let photo_url = null;

  // upload da foto (se existir)
  if (payload.photoFile) {
    photo_url = await uploadPublic(supabase, payload.photoFile, state.user.id);
  }

  const insertData = {
    user_id: state.user.id,
    route_id: payload.route_id,
    lat: payload.lat,
    lng: payload.lng,
    note: payload.note || "",
    status: payload.status || "CATALOGADO",
    species: payload.species || null,
    photo_url,
    cataloged_at: new Date().toISOString(),
    captured_at: null
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function finishRoute(supabase, routeId, pathArr, trapsArr) {
  const payload = {
    status: "FINISHED",
    ended_at: new Date().toISOString(),
    path: Array.isArray(pathArr) ? pathArr : [],
    traps: Array.isArray(trapsArr) ? trapsArr : [],
  };

  const { data, error } = await supabase
    .from("routes")
    .update(payload)
    .eq("id", routeId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMyRoutes(supabase, userId) {
  const { data, error } = await supabase
    .from("routes")
    .select("id,name,status,started_at,ended_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// js/nests.js
// CORREÇÃO: Caminho arrumado para ./ (pasta local)
import { state } from "./state.js";
import { uploadPublic } from "./storage.js";

export async function createNest(supabase, payload) {
  if (!state.user) throw new Error("Usuário não autenticado.");
  
  let photo_url = null;
  if (payload.photoFile) {
    try {
      photo_url = await uploadPublic(supabase, payload.photoFile, state.user.id);
    } catch(e) { console.error("Upload falhou", e); }
  }

  const { data, error } = await supabase
    .from("nests")
    .insert({
      user_id: state.user.id,
      route_id: payload.route_id,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note || "",
      status: payload.status || "CATALOGADO",
      species: payload.species || null,
      photo_url,
      cataloged_at: new Date().toISOString()
    })
    .select().single();

  if (error) throw new Error(error.message);

  state.allNests.unshift(data);
  return data;
}

export async function loadMyNests(supabase) {
  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  state.allNests = data || [];
  return state.allNests;
}
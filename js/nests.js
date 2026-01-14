// js/nests.js
import { state } from "./state.js";
import { uploadPublic } from "./storage.js";

export async function createNest(supabase, payload) {
  if (!state.user) throw new Error("Não autenticado");
  
  let photo_url = null;
  if (payload.photoFile) {
    photo_url = await uploadPublic(supabase, payload.photoFile, state.user.id);
  }

  const { data, error } = await supabase
    .from("nests")
    .insert({
      user_id: state.user.id,
      route_id: payload.route_id || null,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note,
      status: payload.status || "DEPOSITADO",
      species: payload.species,
      photo_url,
      cataloged_at: new Date().toISOString(),
      // Se já marcar como capturado, define a data de captura agora
      captured_at: payload.status === "CAPTURADO" ? new Date().toISOString() : null
    })
    .select().single();

  if (error) throw error;
  state.allNests.unshift(data);
  return data;
}

export async function loadMyNests(supabase) {
  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.allNests = data || [];
  return state.allNests;
}

export async function markAsCaptured(supabase, nestId) {
  const { data, error } = await supabase
    .from("nests")
    .update({ 
      status: "CAPTURADO", 
      captured_at: new Date().toISOString() 
    })
    .eq("id", nestId)
    .select().single();

  if (error) throw error;
  return data;
}
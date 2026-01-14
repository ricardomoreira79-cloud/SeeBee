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
      route_id: payload.route_id,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note,
      status: payload.status,
      species: payload.species,
      photo_url,
      cataloged_at: new Date().toISOString()
    })
    .select().single();

  if (error) throw error;
  return data;
}

export async function loadMyNests(supabase) {
  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.allNests = data || [];
  return data;
}
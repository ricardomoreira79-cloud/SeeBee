// js/nests.js
import { state } from "./state.js"; 
import { uploadPublic } from "./storage.js";

export async function createNest(supabase, payload) {
  if (!state.user) throw new Error("Usuário não autenticado.");
  
  let photo_url = null;
  if (payload.photoFile) {
    try {
      photo_url = await uploadPublic(supabase, payload.photoFile, state.user.id);
    } catch (e) { console.warn("Erro no upload da foto:", e); }
  }

  const { data, error } = await supabase
    .from("nests")
    .insert({
      user_id: state.user.id,
      route_id: payload.route_id,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note || "",
      status: "CATALOGADO",
      photo_url: photo_url // Confirme se no banco é photo_url ou photoUrl
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
  return data;
}
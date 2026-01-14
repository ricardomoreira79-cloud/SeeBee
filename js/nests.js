// js/nests.js
import { state } from "./state.js"; // IMPORT CORRIGIDO
import { uploadPublic } from "./storage.js"; // IMPORT CORRIGIDO

export async function createNest(supabase, payload) {
  if (!state.user) throw new Error("Usuário não autenticado.");
  
  let photo_url = null;
  if (payload.photoFile) {
    // Tenta fazer upload, se falhar o ninho ainda é criado sem foto
    try {
      photo_url = await uploadPublic(supabase, payload.photoFile, state.user.id);
    } catch (e) { console.error("Erro upload:", e); }
  }

  const { data, error } = await supabase
    .from("nests")
    .insert({
      user_id: state.user.id,
      route_id: payload.route_id,
      lat: payload.lat,
      lng: payload.lng,
      note: payload.note,
      status: "CATALOGADO",
      photo_url: photo_url // Verifique se a coluna no banco é exatamente photo_url
    })
    .select().single();

  if (error) throw error;
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
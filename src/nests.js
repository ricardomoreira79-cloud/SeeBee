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
    .from("nests")
    .insert(insertData)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // mantém listas locais (e não mistura usuários)
  state.nestsThisRoute.push(data);
  state.allNests.unshift(data);

  return data;
}

export async function loadMyNests(supabase) {
  const { data, error } = await supabase
    .from("nests")
    .select("id,route_id,lat,lng,note,status,species,photo_url,cataloged_at,captured_at,created_at")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  state.allNests = data || [];
  return state.allNests;
}

/**
 * (para próxima etapa) marcar como capturado
 */
export async function markNestCaptured(supabase, nestId, species = null) {
  const { data, error } = await supabase
    .from("nests")
    .update({
      status: "CAPTURADO",
      captured_at: new Date().toISOString(),
      species: species || null
    })
    .eq("id", nestId)
    .eq("user_id", state.user.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // reflete localmente
  state.allNests = state.allNests.map(n => (n.id === nestId ? data : n));
  state.nestsThisRoute = state.nestsThisRoute.map(n => (n.id === nestId ? data : n));

  return data;
}

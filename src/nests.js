import { state } from "./state.js";
import { uploadNestPhoto } from "./storage.js";

export async function createNest(supabase, { note, status, species, lat, lng, route_id, photoFile }) {
  if (!state.user) throw new Error("Sem usuário.");

  let photo = null;
  if (photoFile) photo = await uploadNestPhoto(supabase, photoFile);

  // datas: catalogado sempre guarda data
  const now = new Date().toISOString();
  const cataloged_at = now;
  const captured_at = (status === "CAPTURADO") ? now : null;

  const payload = {
    user_id: state.user.id,
    route_id,
    note,
    status,
    species,
    lat,
    lng,
    cataloged_at,
    captured_at,
    photo_path: photo?.path || null,
    photo_url: photo?.publicUrl || null
  };

  const { data, error } = await supabase
    .from("nests")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  state.nestsThisRoute.unshift(data);
  return data;
}

export async function loadMyNests(supabase) {
  if (!state.user) return [];

  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .eq("user_id", state.user.id)
    .order("cataloged_at", { ascending: false });

  if (error) throw error;
  state.allNests = data || [];
  return state.allNests;
}

export async function setNestCaptured(supabase, nestId, species = null) {
  const now = new Date().toISOString();
  const patch = { status: "CAPTURADO", captured_at: now };
  if (species) patch.species = species;

  const { data, error } = await supabase
    .from("nests")
    .update(patch)
    .eq("id", nestId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

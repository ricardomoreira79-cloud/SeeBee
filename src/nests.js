import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { uploadNestPhoto } from "./storage.js";

export async function createNest({ routeId, obs, status, lat, lng, file }) {
  const userId = state.session?.user?.id;
  if (!userId) throw new Error("Sem sessão.");
  if (!routeId) throw new Error("Inicie um trajeto antes de marcar ninho.");

  let photo_url = null;
  let photo_path = null;

  if (file) {
    const up = await uploadNestPhoto({ userId, routeId, file });
    photo_url = up.publicUrl;
    photo_path = up.path;
  }

  const payload = {
    user_id: userId,
    route_id: routeId,
    obs: obs || null,
    status: status || "DEPLOYED",
    lat,
    lng,
    photo_url,
    photo_path,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("nests")
    .insert(payload)
    .select("id, obs, status, lat, lng, photo_url, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listNestsByRoute(routeId) {
  const { data, error } = await supabase
    .from("nests")
    .select("id, obs, status, lat, lng, photo_url, created_at")
    .eq("route_id", routeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

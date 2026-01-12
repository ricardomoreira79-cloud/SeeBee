import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { uploadNestPhoto } from "./storage.js";

export async function insertNest({ routeId, lat, lng, status, note, file }) {
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

  // ✅ IMPORTANTE:
  // A tabela public.nests precisa ter a coluna `note` (SQL que te passei).
  // Também precisa ter RLS permitindo INSERT do próprio user_id.
  const payload = {
    user_id: user.id,
    route_id: routeId,
    lat,
    lng,
    status,
    note: note || null,
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
    .select("id,status,note,photo_url,lat,lng,created_at")
    .eq("route_id", routeId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

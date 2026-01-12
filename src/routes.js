import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

export async function createRoute(name = null) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const payload = {
    user_id: user.id,
    name: name || `Trilha ${new Date().toLocaleString("pt-BR")}`
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("id,name,created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoutePath(routeId, points) {
  if (!routeId) return;

  const { error } = await supabase
    .from("routes")
    .update({ path: points })
    .eq("id", routeId);

  if (error) throw error;
}

export async function listMyRoutes() {
  const user = state.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("routes")
    .select("id,name,created_at,path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

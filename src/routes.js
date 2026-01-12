import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

export async function createRoute(name = null) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  // tabela: public.routes (deve existir)
  // campos esperados: id(uuid default), user_id(uuid), name(text), created_at(default now), path(jsonb opcional)
  const payload = {
    user_id: user.id,
    name: name || `Trilha ${new Date().toLocaleString("pt-BR")}`
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function updateRoutePath(routeId, points) {
  if (!routeId) return;

  const { error } = await supabase
    .from("routes")
    .update({ path: points })
    .eq("id", routeId);

  if (error) throw error;
}

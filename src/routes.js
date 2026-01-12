import { State } from "./state.js";

export async function createRouteIfNeeded(name){
  if (State.activeRouteId) return State.activeRouteId;

  const user = State.user;
  if (!user) throw new Error("Você precisa estar logado para iniciar um trajeto.");

  // Ajuste para o SEU schema real (não usar coluna status!)
  const payload = {
    user_id: user.id,
    name: name || `Trilha ${new Date().toLocaleString("pt-BR")}`,
    path: [],   // jsonb
    traps: []   // jsonb (se você usa isso)
  };

  const { data, error } = await State.supabase
    .from("routes")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  State.activeRouteId = data.id;
  return data.id;
}

export async function appendPointToRoute(routeId, point){
  // point: { t, lat, lng, acc }
  const { data: route, error: e1 } = await State.supabase
    .from("routes")
    .select("id,path")
    .eq("id", routeId)
    .single();

  if (e1) throw e1;

  const path = Array.isArray(route.path) ? route.path : [];
  path.push(point);

  const { error: e2 } = await State.supabase
    .from("routes")
    .update({ path })
    .eq("id", routeId);

  if (e2) throw e2;
}

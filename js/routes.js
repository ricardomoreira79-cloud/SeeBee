// js/routes.js
import { state } from "./state.js";
import { persistLocalRoutes, loadLocalRoutes } from "./storage.js";

/**
 * Cria uma trilha nova com nome definido no INÍCIO
 */
export async function createRoute(supabase, customName) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  // Se o usuário não digitou nada, usa o padrão com data/hora
  const finalName = customName || `Trilha ${new Date().toLocaleString("pt-BR")}`;

  const payload = {
    user_id: user.id,
    name: finalName,
    status: "recording",
    path: [],
    traps: [] 
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  state.currentRoute = data;
  state.routePoints = [];
  state.nestsThisRoute = [];
  state._dist = 0; // Reseta distância
  return data;
}

export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  state.routePoints.push(point);

  // Atualiza objeto local e visual
  const currentPath = state.currentRoute.path || [];
  const newPath = [...currentPath, point];
  state.currentRoute.path = newPath;

  // Atualiza no banco silenciosamente
  const { error } = await supabase
    .from("routes")
    .update({ path: newPath })
    .eq("id", state.currentRoute.id)
    .eq("user_id", state.user.id);

  if (error) console.error("Erro sync ponto:", error.message);
}

export async function finishRoute(supabase) {
  if (!state.currentRoute) return;

  const { error } = await supabase
    .from("routes")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
      path: state.currentRoute.path || []
    })
    .eq("id", state.currentRoute.id)
    .eq("user_id", state.user.id);

  if (error) throw new Error(error.message);

  state.currentRoute = null;
}

export async function loadMyTrails(supabase) {
  const { data, error } = await supabase
    .from("routes")
    .select("id,name,created_at,status,path,ended_at")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  state.allTrails = data || [];
  return state.allTrails;
}
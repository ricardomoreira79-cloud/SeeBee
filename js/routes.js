// js/routes.js
import { state } from "./state.js";
import { persistLocalRoutes, loadLocalRoutes } from "./storage.js";

/**
 * Cria uma trilha nova e limpa o estado anterior
 */
export async function createRoute(supabase) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const name = `Trilha ${new Date().toLocaleString("pt-BR")}`;

  const payload = {
    user_id: user.id,
    name,
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
  return data;
}

/**
 * Adiciona ponto GPS ao trajeto atual
 */
export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  state.routePoints.push(point);
  
  // Atualiza objeto local
  const currentPath = state.currentRoute.path || [];
  const newPath = [...currentPath, point];
  state.currentRoute.path = newPath;

  // Atualiza no banco
  const { error } = await supabase
    .from("routes")
    .update({ path: newPath })
    .eq("id", state.currentRoute.id)
    .eq("user_id", state.user.id);

  if (error) console.error("Erro ao salvar ponto:", error.message);
}

/**
 * Finaliza a trilha
 */
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

/**
 * Carrega histórico de trilhas
 */
export async function loadMyTrails(supabase) {
  const { data, error } = await supabase
    .from("routes")
    .select("id,name,created_at,status,path,ended_at")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  state.allTrails = data || [];
  // Aproveita para salvar cache local
  persistLocalRoutes(state.allTrails);
  
  return state.allTrails;
}
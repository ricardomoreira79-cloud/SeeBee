// js/routes.js
import { state } from "./state.js";

export async function createRoute(supabase, customName) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const name = customName || `Trilha ${new Date().toLocaleString("pt-BR")}`;

  // Payload simplificado para evitar erros de colunas extras
  const payload = {
    user_id: user.id,
    name: name,
    status: "recording",
    path: [],
    // traps: [] // Removido temporariamente para testar se é isso que está travando o insert. Se seu banco exigir, descomente.
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Erro CreateRoute:", error);
    throw new Error(error.message);
  }

  state.currentRoute = data;
  state.routePoints = [];
  state.nestsThisRoute = [];
  state._dist = 0;
  return data;
}

export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  state.routePoints.push(point);
  const newPath = [...(state.currentRoute.path || []), point];
  state.currentRoute.path = newPath;

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
    .select("*") // Traz tudo para garantir
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro LoadTrails:", error);
    return [];
  }

  state.allTrails = data || [];
  return state.allTrails;
}
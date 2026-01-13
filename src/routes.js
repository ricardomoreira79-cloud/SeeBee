import { state } from "./state.js";

/**
 * Cria uma trilha (route) com path SEMPRE iniciado em []
 * e status = 'recording'
 */
export async function createRoute(supabase) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const name = `Trilha ${new Date().toLocaleString("pt-BR")}`;

  // À prova de falhas: path sempre [] aqui
  const payload = {
    user_id: user.id,
    name,
    status: "recording",
    path: [],     // <- NUNCA null
    traps: []     // se sua tabela tiver traps, ok; se não tiver, remova
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
 * Faz append de ponto:
 * - mantém state.routePoints
 * - atualiza routes.path no banco (evita null)
 */
export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  state.routePoints.push(point);

  // Atualiza local também
  state.currentRoute.path = [...(state.currentRoute.path || []), point];

  // Sincroniza no banco (a cada ponto, simples e robusto)
  const { error } = await supabase
    .from("routes")
    .update({ path: state.currentRoute.path })
    .eq("id", state.currentRoute.id)
    .eq("user_id", state.user.id);

  if (error) throw new Error(error.message);
}

/**
 * Finaliza trilha: status + ended_at
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
 * Lista trilhas do usuário
 */
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

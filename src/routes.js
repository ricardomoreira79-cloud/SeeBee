import { state } from "./state.js";

export async function createRoute(supabase) {
  if (!state.user) throw new Error("Sem usuário.");

  const name = `Trilha ${new Date().toLocaleString("pt-BR")}`;

  // IMPORTANTE: path e traps NUNCA podem ser null
  const payload = {
    user_id: state.user.id,
    name,
    created_at: new Date().toISOString(),
    path: [],     // <-- resolve o erro do print
    traps: []     // <-- segurança extra
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  state.currentRoute = data;
  state.routePoints = [];
  state.nestsThisRoute = [];
  return data;
}

export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  state.routePoints.push(point);

  // atualiza periodicamente a rota no banco
  if (state.routePoints.length % 5 !== 0) return;

  const { error } = await supabase
    .from("routes")
    .update({ path: state.routePoints })
    .eq("id", state.currentRoute.id);

  if (error) throw error;
}

export async function finishRoute(supabase) {
  if (!state.currentRoute) return;

  const { error } = await supabase
    .from("routes")
    .update({
      path: state.routePoints,
      finished_at: new Date().toISOString()
    })
    .eq("id", state.currentRoute.id);

  if (error) throw error;

  const done = state.currentRoute;
  state.currentRoute = null;
  return done;
}

export async function loadMyTrails(supabase) {
  if (!state.user) return [];

  const { data, error } = await supabase
    .from("routes")
    .select("id,name,created_at,finished_at,path")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  state.allTrails = data || [];
  return state.allTrails;
}

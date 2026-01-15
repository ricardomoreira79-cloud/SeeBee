// js/routes.js
import { state } from "./state.js";

export async function createRoute(supabase, customName) {
  const user = state.user;
  if (!user) throw new Error("Login necessário.");

  const { data, error } = await supabase
    .from("routes")
    .insert({
      user_id: user.id,
      name: customName,
      status: "recording",
      path: []
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  state.currentRoute = data;
  state.routePoints = [];
  state.nestCount = 0; // Zera contador interno
  state._dist = 0;
  return data;
}

export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;
  
  // Adiciona ponto localmente
  const newPath = [...(state.currentRoute.path || []), point];
  state.currentRoute.path = newPath;

  // Atualiza no banco (debounce idealmente, mas direto por enquanto)
  await supabase
    .from("routes")
    .update({ path: newPath })
    .eq("id", state.currentRoute.id);
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
    .eq("id", state.currentRoute.id);

  if (error) throw new Error(error.message);
  state.currentRoute = null;
}

// NOVA FUNÇÃO: Deleta a trilha se não tiver ninhos
export async function discardRoute(supabase) {
  if (!state.currentRoute) return;

  const { error } = await supabase
    .from("routes")
    .delete()
    .eq("id", state.currentRoute.id);

  if (error) console.error("Erro ao descartar:", error);
  state.currentRoute = null;
}

export async function loadMyTrails(supabase) {
  // Só carrega trilhas que foram finalizadas (status 'finished')
  // para não mostrar lixo de testes anteriores
  const { data, error } = await supabase
    .from("routes")
    .select("*, nests(count)") // Tenta contar ninhos se o Supabase permitir
    .eq("user_id", state.user.id)
    .eq("status", "finished") 
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}
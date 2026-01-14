// js/routes.js
import { state } from "./state.js";

export async function createRoute(supabase) {
  if (!state.user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("routes")
    .insert({
      user_id: state.user.id,
      name: `Trilha ${new Date().toLocaleString("pt-BR")}`,
      status: "ACTIVE",
      path: [],
      traps: [] // Coluna JSONB identificada no Supabase
    })
    .select().single();

  if (error) throw error;
  state.currentRoute = data;
  return data;
}

export async function appendRoutePoint(supabase, point) {
  if (!state.currentRoute) return;

  const newPath = [...(state.currentRoute.path || []), point];
  state.currentRoute.path = newPath;

  await supabase
    .from("routes")
    .update({ path: newPath })
    .eq("id", state.currentRoute.id);
}

export async function finishRoute(supabase) {
  if (!state.currentRoute) return;

  await supabase
    .from("routes")
    .update({ status: "FINISHED" })
    .eq("id", state.currentRoute.id);

  state.currentRoute = null;
}

export async function loadMyTrails(supabase) {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.allTrails = data || [];
  return data;
}
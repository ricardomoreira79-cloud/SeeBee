import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

/**
 * Cria um trajeto no banco e retorna routeId.
 * IMPORTANTE: não usa coluna "status" (porque seu schema não tem).
 */
export async function createRoute(name) {
  const userId = state.session?.user?.id;
  if (!userId) throw new Error("Sem sessão.");

  const payload = {
    user_id: userId,
    name: name || `Trajeto ${new Date().toLocaleString("pt-BR")}`,
    path: [],   // você já tem no schema
    traps: []   // você já tem no schema
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function appendRoutePoint(routeId, point) {
  // Para simplificar e evitar leitura/merge concorrente:
  // vamos guardar path local no state e ao finalizar salvamos tudo.
  // (Se quiser tempo real no DB, eu ajusto depois com RPC/merge seguro.)
  return true;
}

export async function finishRoute(routeId, allPoints) {
  const { error } = await supabase
    .from("routes")
    .update({ path: allPoints })
    .eq("id", routeId);

  if (error) throw error;
}

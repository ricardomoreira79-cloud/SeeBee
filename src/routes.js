import { supabase } from "./supabaseClient.js";

/**
 * Cria trajeto (routes).
 * Não depende de 'status' para não quebrar seu banco atual.
 */
export async function createRoute({ userId, name, startLat, startLng }) {
  const payload = {
    name,
    user_id: userId, // se não existir no banco, vai falhar -> nesse caso remova esta linha
    path: [{ t: new Date().toISOString(), lat: startLat, lng: startLng }],
    traps: [],
  };

  // Tenta inserir com user_id; se o banco não tiver essa coluna, removemos e tentamos novamente
  let res = await supabase.from("routes").insert(payload).select("*").single();
  if (res.error && String(res.error.message || "").includes("user_id")) {
    delete payload.user_id;
    res = await supabase.from("routes").insert(payload).select("*").single();
  }

  if (res.error) throw res.error;
  return res.data;
}

export async function appendPoint(routeId, point) {
  // Busca route atual
  const { data: route, error } = await supabase.from("routes").select("id,path").eq("id", routeId).single();
  if (error) throw error;

  const nextPath = Array.isArray(route.path) ? [...route.path, point] : [point];

  const { data, error: upErr } = await supabase
    .from("routes")
    .update({ path: nextPath })
    .eq("id", routeId)
    .select("id,path")
    .single();

  if (upErr) throw upErr;
  return data;
}

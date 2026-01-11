import { supabase } from "./supabaseClient.js";

/**
 * Cria ninho na tabela public.nests
 * Campos esperados (mínimo): id (uuid default), user_id (se houver), route_id (se houver), lat,lng, status, notes
 *
 * Como seu schema pode variar, eu mando de forma resiliente:
 * tenta inserir com vários campos; se falhar por coluna inexistente, tenta com menos.
 */
export async function createNest({ userId, routeId, lat, lng, status, notes }) {
  const candidates = [
    { user_id: userId, route_id: routeId, lat, lng, status, notes },
    { user_id: userId, lat, lng, status, notes },
    { route_id: routeId, lat, lng, status, notes },
    { lat, lng, status, notes },
  ];

  let lastErr = null;

  for (const payload of candidates) {
    const res = await supabase.from("nests").insert(payload).select("*").single();
    if (!res.error) return res.data;
    lastErr = res.error;
  }

  throw lastErr;
}

/**
 * Registra a foto na tabela public.photos
 * Sugestão de campos: user_id, nest_id, path, kind, created_at
 */
export async function createPhotoRow({ userId, nestId, path }) {
  const candidates = [
    { user_id: userId, nest_id: nestId, path, kind: "NINHO" },
    { user_id: userId, nest_id: nestId, path },
    { nest_id: nestId, path },
    { path },
  ];

  let lastErr = null;
  for (const payload of candidates) {
    const res = await supabase.from("photos").insert(payload).select("*").single();
    if (!res.error) return res.data;
    lastErr = res.error;
  }

  // Se a tabela photos não existir, não derruba o fluxo do app:
  console.warn("Falha ao registrar em photos:", lastErr?.message || lastErr);
  return null;
}

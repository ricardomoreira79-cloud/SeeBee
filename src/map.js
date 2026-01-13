import { uploadPhoto, getPublicUrl } from "./storage.js";

function buildNotePayload(noteText) {
  // vamos salvar em "note" (padrão novo)
  // mas manter fallback em "obs" se o banco estiver antigo
  return {
    note: noteText || null,
    obs: noteText || null,
  };
}

export async function addNest(supabase, userId, routeId, lat, lng, form) {
  const file = form.photoFile || null;

  let photo_path = null;
  if (file) {
    const up = await uploadPhoto(supabase, file, userId);
    photo_path = up.path;
  }

  const base = {
    user_id: userId,
    route_id: routeId || null,
    lat,
    lng,
    status: form.status || "CATALOGADO",
    species: form.species || null,
    photo_path,
    cataloged_at: new Date().toISOString(),
  };

  const notePayload = buildNotePayload(form.note || "");

  // tentativa 1: inserir com note
  {
    const { data, error } = await supabase
      .from("nests")
      .insert({ ...base, note: notePayload.note })
      .select("*")
      .single();

    if (!error) return data;

    // se falhar por coluna inexistente, tenta com obs
    const msg = String(error.message || "");
    const isMissingNote =
      msg.includes("note") && (msg.includes("does not exist") || msg.includes("schema cache"));

    if (!isMissingNote) throw error;
  }

  // tentativa 2: inserir com obs (banco antigo)
  const { data, error } = await supabase
    .from("nests")
    .insert({ ...base, obs: notePayload.obs })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNestsByRoute(supabase, userId, routeId) {
  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .eq("user_id", userId)
    .eq("route_id", routeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listAllMyNests(supabase, userId) {
  const { data, error } = await supabase
    .from("nests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // adiciona publicUrl (se bucket for público)
  return (data || []).map((n) => ({
    ...n,
    photo_url: n.photo_path ? getPublicUrl(supabase, n.photo_path) : null,
  }));
}

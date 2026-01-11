import { supabase, BUCKET_NINHOS_FOTOS } from "./supabaseClient.js";

/**
 * Retorna { data, error }
 */
export async function listMyNests(limit = 50) {
  const { data, error } = await supabase
    .from("nests")
    .select("id, created_at, title, notes, status, lat, lng, trail_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
}

/**
 * Cria um ninho na tabela public.nests.
 * Campos mínimos esperados (pelo que vimos do seu schema):
 * - user_id (uuid)
 * - title (text)
 * - notes (text)
 * - status (nest_status)
 * - lat (float8)
 * - lng (float8)
 * - trail_id (uuid) (opcional)
 */
export async function createNest({ userId, lat, lng, notes, status, trailId, photoUrl }) {
  const payload = {
    user_id: userId,
    title: `Ninho em ${new Date().toLocaleString("pt-BR")}`,
    notes: notes || null,
    status: status || "DEPLOYED",
    lat,
    lng,
    trail_id: trailId || null,
  };

  // Se você tiver coluna na tabela "nests" para URL da foto (ex.: photo_url),
  // descomente e ajuste o nome:
  // payload.photo_url = photoUrl || null;

  const { data, error } = await supabase
    .from("nests")
    .insert(payload)
    .select()
    .single();

  return { data, error };
}

/**
 * Upload de foto para o bucket, obedecendo sua policy:
 * storage.foldername(name)[1] = auth.uid()
 *
 * Então o "path" TEM QUE começar com: `${user.id}/...`
 */
export async function uploadNestPhoto({ user, file }) {
  if (!file) return { publicUrl: null, path: null, error: null };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";

  // ✅ Caminho que passa na policy: <uid>/<arquivo>
  const path = `${user.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET_NINHOS_FOTOS)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (upErr) return { publicUrl: null, path: null, error: upErr };

  // Como seu bucket está PUBLIC, dá pra gerar publicUrl direto
  const { data } = supabase.storage.from(BUCKET_NINHOS_FOTOS).getPublicUrl(path);
  return { publicUrl: data?.publicUrl || null, path, error: null };
}

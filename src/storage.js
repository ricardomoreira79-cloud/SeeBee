import { supabase } from "./supabaseClient.js";
import { CONFIG } from "./config.js";
import { state } from "./state.js";

export async function uploadNestPhoto(file, routeId) {
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";

  const path = `${user.id}/${routeId || "sem-rota"}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file, { upsert: false });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

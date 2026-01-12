import { CONFIG } from "./config.js";
import { state } from "./state.js";

export async function uploadNestPhoto(supabase, file) {
  if (!file) return null;
  if (!state.user) throw new Error("Sem usuário.");

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${state.user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

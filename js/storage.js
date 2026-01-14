// js/storage.js
import { CONFIG } from "./config.js";

export async function uploadPublic(supabase, file, userId) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const path = `${userId}/${fileName}`; // Pasta isolada por usuário

  const { error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
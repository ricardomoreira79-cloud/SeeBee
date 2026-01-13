import { CONFIG } from "./config.js";

export async function uploadPublic(supabase, file, userId) {
  if (!file) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

  // pasta por usuário (evita 100% "foto vazando")
  const path = `${userId}/${name}`;

  const { error } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

import { CONFIG } from "./config.js";

export async function uploadPhoto(supabase, file, userId) {
  if (!file) return { path: null };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg","jpeg","png","webp","heic"].includes(ext) ? ext : "jpg";

  // Cada usuário tem sua pasta: userId/...
  const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;
  const path = `${userId}/${filename}`;

  const { error } = await supabase.storage.from(CONFIG.STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (error) throw error;
  return { path };
}

export function getPublicUrl(supabase, path) {
  if (!path) return null;
  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

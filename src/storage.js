import { supabase } from "./supabaseClient.js";
import { CONFIG } from "./config.js";

export async function uploadNestPhoto({ userId, routeId, file }) {
  if (!file) return { publicUrl: null, path: null };

  // caminho compatível com sua policy:
  // storage.foldername(name)[1] = auth.uid()
  // então o "primeiro diretório" precisa ser o userId
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg","jpeg","png","webp","heic"].includes(ext) ? ext : "jpg";
  const filename = `${crypto.randomUUID()}.${safeExt}`;
  const path = `${userId}/${routeId}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

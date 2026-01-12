import { State } from "./state.js";
import { CONFIG } from "./config.js";

export async function uploadNestPhoto({ nestId, file }) {
  if (!file) return null;

  const user = State.user;
  if (!user) throw new Error("Você precisa estar logado para enviar foto.");

  const ext = guessExt(file);
  const ts = Date.now();
  const path = `${user.id}/nests/${nestId}/${ts}.${ext}`;

  const { error: upErr } = await State.supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (upErr) throw upErr;

  const { data } = State.supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl || null;
}

function guessExt(file){
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  return "jpg";
}

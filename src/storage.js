import { supabase } from "./supabaseClient.js";
import { STORAGE_BUCKET_NINHOS } from "./config.js";

/**
 * Faz upload da foto para:
 *   <userId>/nests/<nestId>.jpg
 *
 * IMPORTANTE: isso casa com sua policy:
 * storage.foldername(name)[1] = auth.uid()::text
 */
export async function uploadNestPhoto({ userId, nestId, file }) {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/nests/${nestId}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NINHOS)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;
  return { path: data.path };
}

/**
 * Cria URL assinada para visualizar (funciona mesmo com bucket privado).
 */
export async function getSignedUrl(path, expiresIn = 60 * 30) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NINHOS)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

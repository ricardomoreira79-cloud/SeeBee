// js/storage.js
import { CONFIG } from "./config.js";

// --- FUNÇÕES DE ARMAZENAMENTO LOCAL (LOCALSTORAGE) ---
const KEY_ROUTES = "seebee_routes_local";

export function loadLocalRoutes() {
  try {
    const raw = localStorage.getItem(KEY_ROUTES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro ao ler localStorage:", e);
    return [];
  }
}

export function persistLocalRoutes(routes) {
  try {
    localStorage.setItem(KEY_ROUTES, JSON.stringify(routes));
  } catch (e) {
    console.error("Erro ao salvar localStorage:", e);
  }
}

// --- FUNÇÃO DE UPLOAD DE FOTOS (SUPABASE) ---
export async function uploadPublic(supabase, file, userId) {
  if (!file) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;
  
  // Caminho da pasta: user_id/nome_arquivo
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
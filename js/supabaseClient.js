import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { CONFIG } from "./config.js";

let _client = null;

export function getSupabase() {
  if (_client) return _client;

  if (!CONFIG?.SUPABASE_URL || !CONFIG?.SUPABASE_ANON_KEY) {
    throw new Error("CONFIG do Supabase está vazia. Verifique js/config.js");
  }

  _client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "seebee-auth"
    }
  });

  return _client;
}
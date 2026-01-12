import { CONFIG } from "./config.js";

export function getSupabase() {
  if (!window.supabase) throw new Error("Supabase JS (CDN) não carregou.");
  return window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

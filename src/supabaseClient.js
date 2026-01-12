import { CONFIG } from "./config.js";

export function createSupabaseClient() {
  // Supabase v2 via ESM CDN
  // (mantém app estático sem build)
  const scriptId = "supabase-v2";
  const existing = document.getElementById(scriptId);

  const load = () =>
    new Promise((resolve, reject) => {
      if (window.supabase) return resolve(window.supabase);

      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = () => resolve(window.supabase);
      s.onerror = reject;
      document.head.appendChild(s);
    });

  return load().then((sb) => {
    const client = sb.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "seebee-auth"
      }
    });
    return client;
  });
}

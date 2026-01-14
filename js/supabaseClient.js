// js/supabaseClient.js
import { CONFIG } from "./config.js";

let _client = null;
export function getSupabase() {
  if (_client) return _client;
  _client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _client;
}
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ✅ COLE AQUI:
export const SUPABASE_URL = "https://sgrtyotwnlwpwfecnoze.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncnR5b3R3bmx3cHdmZWNub3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NjgxMjcsImV4cCI6MjA4MzM0NDEyN30.QZvTN3mHUwqBwvXeL6q89qNW_4s1Cvopa40nt4TFa9w";

// Bucket do Storage para fotos (o mesmo que você criou)
export const BUCKET_NINHOS_FOTOS = "ninhos-fotos";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

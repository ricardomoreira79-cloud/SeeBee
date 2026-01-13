import { getSupabase } from "./supabaseClient.js";
import { state } from "./state.js";

export async function loadProfile() {
  const supabase = getSupabase(); // Pega a instância ativa
  const user = state.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,user_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro perfil:", error.message);
    return null;
  }
  return data || null;
}

export async function saveProfileUserType(userType) {
  const supabase = getSupabase();
  const user = state.user;
  if (!user) throw new Error("Usuário não autenticado.");

  const payload = {
    user_id: user.id,
    user_type: userType || null
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id,user_type")
    .single();

  if (error) throw error;
  return data;
}
import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";

/**
 * Espera uma tabela public.profiles com:
 * user_id (uuid PK/FK), user_type (text)
 * Se não existir, o app segue sem quebrar (tratamos erro).
 */
export async function loadProfile() {
  const user = state.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,user_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

export async function saveProfileUserType(userType) {
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

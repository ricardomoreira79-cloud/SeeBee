// ARQUIVO: js/meliponario.js
import { state } from "./state.js";

/**
 * Carrega a lista de meliponários do usuário
 */
export async function loadMeliponaries(supabase) {
  if (!state.user) return [];

  // AQUI: O nome 'meliponaries' deve ser IGUAL ao nome da tabela no Supabase
  const { data, error } = await supabase
    .from("meliponaries") 
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar meliponários:", error.message);
    return [];
  }
  return data;
}

/**
 * Cria um novo meliponário
 */
export async function createMeliponary(supabase, name, locationStr) {
  if (!state.user) throw new Error("Você precisa estar logado.");
  
  const { data, error } = await supabase
    .from("meliponaries")
    .insert({
      user_id: state.user.id,
      name: name,
      // Se sua tabela tiver coluna 'location' (texto) ou lat/lng separados, ajuste aqui:
      // location: locationStr 
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
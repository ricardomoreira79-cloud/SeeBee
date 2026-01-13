export async function createRoute(supabase, userId, name = null) {
  const payload = {
    user_id: userId,
    name: name || `Trilha ${new Date().toLocaleString("pt-BR")}`,
    status: "RECORDING",
    started_at: new Date().toISOString(),

    // CRÍTICO: nunca pode ser null (se a coluna é NOT NULL)
    path: [],
    traps: [],
  };

  const { data, error } = await supabase
    .from("routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function finishRoute(supabase, routeId, pathArr, trapsArr) {
  const payload = {
    status: "FINISHED",
    ended_at: new Date().toISOString(),
    path: Array.isArray(pathArr) ? pathArr : [],
    traps: Array.isArray(trapsArr) ? trapsArr : [],
  };

  const { data, error } = await supabase
    .from("routes")
    .update(payload)
    .eq("id", routeId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMyRoutes(supabase, userId) {
  const { data, error } = await supabase
    .from("routes")
    .select("id,name,status,started_at,ended_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

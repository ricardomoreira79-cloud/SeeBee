import { State } from "./state.js";
import { uploadNestPhoto } from "./storage.js";

export async function createNest({ routeId, note, status, lat, lng, photoFile }) {
  const user = State.user;
  if (!user) throw new Error("Você precisa estar logado para marcar um ninho.");

  // 1) cria registro (SEM foto primeiro)
  const payload = {
    user_id: user.id,
    route_id: routeId,
    note: note || "",
    status: status || "DEPLOYED",
    lat,
    lng
  };

  const { data: nest, error: e1 } = await State.supabase
    .from("nests")
    .insert(payload)
    .select("*")
    .single();

  if (e1) throw e1;

  // 2) upload de foto (se houver) e atualiza
  if (photoFile){
    const publicUrl = await uploadNestPhoto({ nestId: nest.id, file: photoFile });

    const { data: updated, error: e2 } = await State.supabase
      .from("nests")
      .update({ photo_url: publicUrl })
      .eq("id", nest.id)
      .select("*")
      .single();

    if (e2) throw e2;

    return updated;
  }

  return nest;
}

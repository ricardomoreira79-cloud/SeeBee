import { supabaseClient } from "./supabaseClient.js";

export async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session || null;
}

export async function signUp(email, password) {
  return await supabaseClient.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  // Dica: usar URL completa ajuda muito em mobile/PWA
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  return await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export async function signOut() {
  return await supabaseClient.auth.signOut();
}

export function onAuthChange(callback) {
  return supabaseClient.auth.onAuthStateChange(() => callback && callback());
}
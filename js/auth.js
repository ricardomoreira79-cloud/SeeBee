import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { setAuthMessage, showAppScreen, showAuthScreen } from "./ui.js";

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp(email, password) {
  setAuthMessage("Criando conta...");
  if (!email || !password) return setAuthMessage("Preencha e-mail e senha.", true);

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return setAuthMessage(error.message, true);

  setAuthMessage("Conta criada! Agora clique em Entrar.", false);
}

export async function signIn(email, password) {
  setAuthMessage("Entrando...");
  if (!email || !password) return setAuthMessage("Preencha e-mail e senha.", true);

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage(error.message, true);

  setAuthMessage("");
  await checkSessionAndRoute();
}

export async function signInWithGoogle() {
  setAuthMessage("");
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  } catch (e) {
    console.error(e);
    setAuthMessage("Não foi possível iniciar o login com Google.", true);
  }
}

export async function logout() {
  await supabaseClient.auth.signOut();
  await checkSessionAndRoute();
}

export async function checkSessionAndRoute() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (session) {
    showAppScreen(session.user?.email || "");
    return { logged: true, session };
  } else {
    showAuthScreen();
    return { logged: false, session: null };
  }
}

export function onAuthChange(handler) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    handler?.(event, session);
  });
}

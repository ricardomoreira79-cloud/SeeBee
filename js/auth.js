import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEY_ROUTES } from "./config.js";
import { setAuthMessage, showAppScreen, showAuthScreen } from "./ui.js";

// Inicializa o cliente Supabase
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
  // 1. Desloga do servidor
  await supabaseClient.auth.signOut();
  
  // 2. SEGURANÇA: Limpa os dados locais do usuário anterior
  localStorage.removeItem(STORAGE_KEY_ROUTES);
  
  // 3. Força um recarregamento da página para limpar variáveis de memória (RAM)
  window.location.reload();
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
    // Se o usuário deslogar por outro meio (ex: expiração de token), forçamos a limpeza
    if (event === 'SIGNED_OUT') {
       localStorage.removeItem(STORAGE_KEY_ROUTES);
       window.location.reload();
    }
    handler?.(event, session);
  });
}
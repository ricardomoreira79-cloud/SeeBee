// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, toast, setOnlineUI, clearNestForm } from "./ui.js";
import { CONFIG } from "./config.js";

// Inicializa o cliente Supabase usando o objeto CONFIG centralizado
export const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

function niceAuthError(msg) {
  const m = String(msg || "");
  if (m.toLowerCase().includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.toLowerCase().includes("email not confirmed")) return "Verifique seu e-mail para confirmar a conta.";
  if (m.toLowerCase().includes("user already registered")) return "E-mail já cadastrado.";
  return m;
}

// Função auxiliar para mostrar telas (substituindo a antiga showScreen se necessário)
function showAppScreen(show) {
  if (show) {
    ui.screenLogin?.classList.add("hidden");
    ui.screenApp?.classList.remove("hidden");
  } else {
    ui.screenLogin?.classList.remove("hidden");
    ui.screenApp?.classList.add("hidden");
  }
}

export function bindAuth(supabase, onLoggedIn) {
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      clearNestForm();
      setOnlineUI(false, true);
      showAppScreen(false);
      return;
    }

    state.user = session.user;
    setOnlineUI(navigator.onLine, false);
    showAppScreen(true);
    await onLoggedIn();
  }

  // Escuta mudanças na autenticação (Login/Logout)
  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });

  // Login por e-mail/senha
  ui.btnLogin?.addEventListener("click", async () => {
    const email = ui.email?.value.trim();
    const password = ui.password?.value;
    if (!email || !password) return toast(ui.authMsg, "Preencha e-mail e senha.", "error");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message), "error");
    }
  });

  // Criar conta
  ui.btnSignup?.addEventListener("click", async () => {
    const email = ui.email?.value.trim();
    const password = ui.password?.value;
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast(ui.authMsg, "Conta criada! Verifique seu e-mail.", "ok");
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message), "error");
    }
  });

  // Login com Google
  ui.btnGoogle?.addEventListener("click", async () => {
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (e) {
      toast(ui.authMsg, "Erro ao conectar com Google.", "error");
    }
  });
}
// src/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, showScreen, toast, setOnlineUI, clearNestForm } from "./ui.js";

function niceAuthError(msg) {
  const m = String(msg || "");
  if (m.toLowerCase().includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (m.toLowerCase().includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  if (m.toLowerCase().includes("user already registered")) return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.toLowerCase().includes("signup is disabled")) return "Cadastro desativado no Supabase.";
  if (m.toLowerCase().includes("redirect")) return "Redirect não permitido no Supabase. Ajuste as Redirect URLs.";
  return m;
}

export function bindAuth(supabase, onLoggedIn) {
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      clearNestForm();
      setOnlineUI(false, true); // escondido no login
      showScreen("login");
      return;
    }

    state.user = session.user;
    setOnlineUI(navigator.onLine, false); // aparece após login
    showScreen("home");
    await onLoggedIn();
  }

  // Sessão inicial
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) ui.authMsg.textContent = niceAuthError(error.message);
    applySession(data?.session);
  });

  // Mudanças de sessão
  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session);
  });

  // Login por e-mail/senha
  ui.btnLogin.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";
      const email = ui.email.value.trim();
      const password = ui.password.value;

      if (!email || !password) {
        return toast(ui.authMsg, "Informe e-mail e senha.", "error");
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      ui.email.value = "";
      ui.password.value = "";
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message || e), "error");
    }
  });

  // Criar conta
  ui.btnSignup.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";
      const email = ui.email.value.trim();
      const password = ui.password.value;

      if (!email || !password) {
        return toast(ui.authMsg, "Informe e-mail e senha para cadastrar.", "error");
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Se confirmação de e-mail estiver ligada:
      if (!data?.session) {
        toast(ui.authMsg, "Conta criada! Confirme o e-mail para entrar.", "ok");
      } else {
        toast(ui.authMsg, "Conta criada e logada!", "ok");
      }
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message || e), "error");
    }
  });

  // Login com Google
  ui.btnGoogle.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";

      // ✅ garante redirect consistente (especialmente no Live Server)
      const redirectTo = `${window.location.origin}${window.location.pathname.endsWith("index.html") ? "" : "/index.html"}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });

      if (error) throw error;
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message || e), "error");
    }
  });

  // Logout (menu)
  ui.btnLogout.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";
      await supabase.auth.signOut();
      // applySession será chamado pelo onAuthStateChange e volta pro login
    } catch (e) {
      toast(ui.authMsg, niceAuthError(e.message || e), "error");
    }
  });
}

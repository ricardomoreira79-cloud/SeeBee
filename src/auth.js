import { state, resetSessionState } from "./state.js";
import { ui, showScreen, toast, setOnlineUI, clearNestForm } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      clearNestForm();
      setOnlineUI(false, true); // escondido
      showScreen("login");
      return;
    }

    state.user = session.user;
    setOnlineUI(navigator.onLine, false); // visível
    showScreen("home");
    await onLoggedIn();
  }

  // estado inicial
  supabase.auth.getSession().then(({ data }) => applySession(data.session));

  // mudanças de auth
  supabase.auth.onAuthStateChange((_event, session) => applySession(session));

  // login email/senha
  ui.btnLogin.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";
      const email = ui.email.value.trim();
      const password = ui.password.value;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      ui.email.value = "";
      ui.password.value = "";
    } catch (e) {
      ui.authMsg.textContent = e.message || String(e);
    }
  });

  // signup
  ui.btnSignup.addEventListener("click", async () => {
    try {
      ui.authMsg.textContent = "";
      const email = ui.email.value.trim();
      const password = ui.password.value;

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      toast(ui.authMsg, "Conta criada! Verifique seu e-mail (se exigir confirmação).", "ok");
    } catch (e) {
      ui.authMsg.textContent = e.message || String(e);
    }
  });

  // login google
  ui.btnGoogle.addEventListener("click", async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (e) {
      ui.authMsg.textContent = e.message || String(e);
    }
  });

  // logoff (menu)
  ui.btnLogout.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();
      // o onAuthStateChange cuida do resto
    } catch (e) {
      toast(ui.authMsg, e.message || String(e), "error");
    }
  });
}

// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, showScreen, toast, setOnlineUI } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      showScreen("login");
      return;
    }
    state.user = session.user;
    
    // Atualiza menu
    if(ui.menuEmail) ui.menuEmail.textContent = session.user.email;
    if(ui.menuAvatar) ui.menuAvatar.textContent = session.user.email.charAt(0).toUpperCase();

    showScreen("home");
    if(onLoggedIn) await onLoggedIn();
  }

  supabase.auth.getSession().then(({ data }) => applySession(data?.session));
  supabase.auth.onAuthStateChange((_e, session) => applySession(session));

  // Ações
  ui.btnLogin.onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: ui.email.value.trim(), password: ui.password.value
    });
    if(error) toast(ui.authMsg, error.message, "error");
  };

  ui.btnSignup.onclick = async () => {
    const { error } = await supabase.auth.signUp({
      email: ui.email.value.trim(), password: ui.password.value
    });
    if(error) toast(ui.authMsg, error.message, "error");
    else toast(ui.authMsg, "Verifique seu e-mail!", "ok");
  };

  ui.btnGoogle.onclick = async () => {
    const redirectTo = window.location.origin + window.location.pathname;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  };
}
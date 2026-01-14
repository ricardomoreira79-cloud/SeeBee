// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      state.user = session.user;
      ui.screenLogin.classList.add("hidden");
      ui.screenApp.classList.remove("hidden");
      document.getElementById("menu-email-display").textContent = session.user.email;
      document.getElementById("menu-avatar-char").textContent = session.user.email[0].toUpperCase();
      await onLoggedIn();
    } else {
      state.user = null;
      resetSessionState();
      ui.screenLogin.classList.remove("hidden");
      ui.screenApp.classList.add("hidden");
    }
  });

  ui.btnLogin.onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: ui.email.value, password: ui.password.value
    });
    if (error) alert("Erro de Login: " + error.message);
  };

  ui.btnSignup.onclick = async () => {
    const { error } = await supabase.auth.signUp({
      email: ui.email.value, password: ui.password.value
    });
    if (error) alert("Erro: " + error.message);
    else alert("Verifique seu e-mail para confirmar a conta!");
  };

  ui.btnGoogle.onclick = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert("Erro Google: " + error.message);
  };
}
// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      state.user = session.user;
      ui.screenLogin.classList.add("hidden");
      ui.screenApp.classList.remove("hidden");
      ui.menuEmailDisplay.textContent = session.user.email;
      ui.menuAvatarChar.textContent = session.user.email[0].toUpperCase();
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
    if (error) alert("Erro: " + error.message);
  };

  ui.btnSignup.onclick = async () => {
    const { error } = await supabase.auth.signUp({
      email: ui.email.value, password: ui.password.value
    });
    if (error) alert(error.message);
    else alert("Verifique seu e-mail para confirmar a conta!");
  };

  // REDIRECT GOOGLE: Importante para Vercel
  ui.btnGoogle.onclick = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };
}
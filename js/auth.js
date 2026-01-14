// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, switchTab } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  // Observa mudanças de login (Entrar/Sair)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      state.user = session.user;
      ui.screenLogin.classList.add("hidden");
      ui.screenApp.classList.remove("hidden");
      await onLoggedIn();
    } else {
      state.user = null;
      resetSessionState();
      ui.screenLogin.classList.remove("hidden");
      ui.screenApp.classList.add("hidden");
    }
  });

  // Botão Entrar
  ui.btnLogin.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: ui.email.value,
      password: ui.password.value
    });
    if (error) alert("Erro: " + error.message);
  });

  // Botão Criar Conta
  ui.btnSignup.addEventListener("click", async () => {
    const { error } = await supabase.auth.signUp({
      email: ui.email.value,
      password: ui.password.value
    });
    if (error) alert("Erro: " + error.message);
    else alert("Verifique seu e-mail para confirmar a conta!");
  });

  // Botão Google
  ui.btnGoogle.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  });
}
// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  // Escuta mudanças de sessão
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

  // Entrar com E-mail
  ui.btnLogin.onclick = async () => {
    ui.authMsg.textContent = "Verificando...";
    const { error } = await supabase.auth.signInWithPassword({
      email: ui.email.value,
      password: ui.password.value
    });
    if (error) ui.authMsg.textContent = "Erro: " + error.message;
  };

  // Criar Conta
  ui.btnSignup.onclick = async () => {
    ui.authMsg.textContent = "Criando conta...";
    const { error } = await supabase.auth.signUp({
      email: ui.email.value,
      password: ui.password.value
    });
    if (error) ui.authMsg.textContent = "Erro: " + error.message;
    else ui.authMsg.textContent = "Verifique seu e-mail!";
  };

  // Entrar com Google (Funcionalidade principal corrigida)
  ui.btnGoogle.onclick = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) alert(error.message);
  };
}
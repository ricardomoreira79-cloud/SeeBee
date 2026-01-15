// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, showScreen, toast, setOnlineUI, clearNestForm } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      setOnlineUI(false, true); // Esconde status no login
      showScreen("login");
      return;
    }
    
    // Usuário logado
    state.user = session.user;
    
    // Atualiza info no menu
    const emailDisplay = document.getElementById("menu-email-display");
    const avatarChar = document.getElementById("menu-avatar-char");
    if(emailDisplay) emailDisplay.textContent = session.user.email;
    if(avatarChar) avatarChar.textContent = session.user.email.charAt(0).toUpperCase();

    setOnlineUI(navigator.onLine); // Mostra status
    showScreen("home");
    
    if(onLoggedIn) await onLoggedIn();
  }

  // Monitora estado inicial e mudanças
  supabase.auth.getSession().then(({ data }) => applySession(data?.session));
  supabase.auth.onAuthStateChange((_e, session) => applySession(session));

  // LOGIN
  ui.btnLogin.addEventListener("click", async () => {
    const email = ui.email.value.trim();
    const password = ui.password.value;
    if(!email || !password) return toast(ui.authMsg, "Preencha tudo.", "error");
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) toast(ui.authMsg, "Erro: " + error.message, "error");
  });

  // CADASTRO
  ui.btnSignup.addEventListener("click", async () => {
    const email = ui.email.value.trim();
    const password = ui.password.value;
    if(!email || !password) return toast(ui.authMsg, "Preencha tudo.", "error");

    const { error } = await supabase.auth.signUp({ email, password });
    if(error) toast(ui.authMsg, "Erro: " + error.message, "error");
    else toast(ui.authMsg, "Verifique seu e-mail!", "ok");
  });

  // GOOGLE
  ui.btnGoogle.addEventListener("click", async () => {
    const origin = window.location.origin;
    // Garante que volta pro index.html se estiver em subpasta ou limpo
    const redirectTo = origin + window.location.pathname; 
    
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: "google", 
      options: { redirectTo } 
    });
    if(error) toast(ui.authMsg, "Erro Google: " + error.message, "error");
  });
}
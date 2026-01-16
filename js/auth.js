// js/auth.js
import { state, resetSessionState } from "./state.js";
import { ui, showScreen, toast, setOnlineUI } from "./ui.js";

export function bindAuth(supabase, onLoggedIn) {
  
  // Verifica se o usuário está voltando do Google (tem hash na URL)
  const isRedirecting = window.location.hash && window.location.hash.includes("access_token");

  async function applySession(session) {
    // Se estiver voltando do Google e a sessão ainda não montou, espera (não joga pro login)
    if (isRedirecting && !session) {
      console.log("Processando retorno do Google...");
      return; 
    }

    if (!session?.user) {
      // Só reseta e vai pro login se NÃO estivermos no meio de um redirect
      if (!isRedirecting) {
        state.user = null;
        resetSessionState();
        showScreen("login");
      }
      return;
    }
    
    // Usuário Logado com Sucesso
    state.user = session.user;
    
    // Atualiza infos visuais do menu
    if(ui.menuEmail) ui.menuEmail.textContent = session.user.email;
    if(ui.menuAvatar) ui.menuAvatar.textContent = session.user.email.charAt(0).toUpperCase();

    showScreen("home"); // Manda para o Painel Principal
    if(onLoggedIn) await onLoggedIn();
  }

  // Monitora o estado da autenticação
  supabase.auth.getSession().then(({ data }) => applySession(data?.session));
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Eventos importantes: SIGNED_IN (Logou), SIGNED_OUT (Saiu), INITIAL_SESSION (Ao abrir)
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      await applySession(session);
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      resetSessionState();
      showScreen("login");
    }
  });

  // --- BOTÕES DE AÇÃO ---

  // Login com E-mail
  if(ui.btnLogin) {
    ui.btnLogin.onclick = async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: ui.email.value.trim(), password: ui.password.value
      });
      if(error) toast(ui.authMsg, "Erro: " + error.message, "error");
    };
  }

  // Criar Conta
  if(ui.btnSignup) {
    ui.btnSignup.onclick = async () => {
      const { error } = await supabase.auth.signUp({
        email: ui.email.value.trim(), password: ui.password.value
      });
      if(error) toast(ui.authMsg, error.message, "error");
      else toast(ui.authMsg, "Verifique seu e-mail!", "ok");
    };
  }

  // Login com Google
  if(ui.btnGoogle) {
    ui.btnGoogle.onclick = async () => {
      // Redireciona para a raiz do site para evitar erros de pasta
      const redirectTo = window.location.origin; 
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google", 
        options: { redirectTo } 
      });
      if(error) toast(ui.authMsg, "Erro Google: " + error.message, "error");
    };
  }
}
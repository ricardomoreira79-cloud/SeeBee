// js/auth.js
import { state, resetSessionState } from "./state.js";
// CORREÇÃO: setOnlineUI agora existe em ui.js e não vai dar erro
import { ui, showScreen, toast, setOnlineUI, clearNestForm } from "./ui.js";
import { CONFIG } from "./config.js";

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

function niceAuthError(msg) {
  if (msg.includes("invalid login")) return "Login inválido.";
  if (msg.includes("already registered")) return "E-mail já cadastrado.";
  return msg;
}

export function bindAuth(unusedSupabase, onLoggedIn) {
  
  async function applySession(session) {
    if (!session?.user) {
      state.user = null;
      resetSessionState();
      setOnlineUI(false, true); // Esconde status
      showScreen("login");
      return;
    }
    state.user = session.user;
    setOnlineUI(navigator.onLine); // Mostra status
    showScreen("home");
    if(onLoggedIn) await onLoggedIn();
  }

  supabase.auth.getSession().then(({ data }) => applySession(data?.session));
  supabase.auth.onAuthStateChange((_e, session) => applySession(session));

  ui.btnLogin.addEventListener("click", async () => {
    const email = ui.email.value.trim();
    const password = ui.password.value;
    if(!email || !password) return toast(ui.authMsg, "Preencha tudo", "error");
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) toast(ui.authMsg, niceAuthError(error.message), "error");
  });

  ui.btnSignup.addEventListener("click", async () => {
    const email = ui.email.value.trim();
    const password = ui.password.value;
    if(!email || !password) return toast(ui.authMsg, "Preencha tudo", "error");

    const { error } = await supabase.auth.signUp({ email, password });
    if(error) toast(ui.authMsg, niceAuthError(error.message), "error");
    else toast(ui.authMsg, "Verifique seu e-mail!", "ok");
  });

  ui.btnGoogle.addEventListener("click", async () => {
    // Redirecionamento limpo
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace("index.html", ""); 
    const redirectTo = origin + pathname; 
    
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  });

  if(ui.btnLogout) {
    ui.btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
    });
  }
}
// Exportamos o client para ser usado no main.js
export const supabaseClient = supabase;
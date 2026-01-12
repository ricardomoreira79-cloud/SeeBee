import { $, showMsg, hideMsg, setLoggedUI, setGuestUI } from "./ui.js";
import { State } from "./state.js";

export async function initAuth() {
  const sb = State.supabase;

  // sessão inicial
  const { data: { session } } = await sb.auth.getSession();
  await applySession(session);

  // ouvir mudanças
  sb.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
  });

  // botões
  $("btnLogin").addEventListener("click", loginWithPassword);
  $("btnSignup").addEventListener("click", signupWithPassword);
  $("btnGoogle").addEventListener("click", loginWithGoogle);
  $("btnLogout").addEventListener("click", logout);
}

async function applySession(session){
  State.session = session;
  State.user = session?.user || null;

  const msg = $("authMsg");
  hideMsg(msg);

  if (State.user){
    setLoggedUI({ userEmail: State.user.email });
  } else {
    setGuestUI();
  }
}

async function loginWithPassword(){
  const msg = $("authMsg");
  hideMsg(msg);

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if (!email || !password){
    showMsg(msg, "Informe e-mail e senha.", true);
    return;
  }

  const { error } = await State.supabase.auth.signInWithPassword({ email, password });
  if (error){
    showMsg(msg, `Falha ao entrar: ${error.message}`, true);
  }
}

async function signupWithPassword(){
  const msg = $("authMsg");
  hideMsg(msg);

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if (!email || !password){
    showMsg(msg, "Informe e-mail e senha para criar conta.", true);
    return;
  }

  const { data, error } = await State.supabase.auth.signUp({
    email,
    password
  });

  if (error){
    showMsg(msg, `Falha ao criar conta: ${error.message}`, true);
    return;
  }

  // se exigir confirmação, não entra na hora
  if (!data.session){
    showMsg(msg, "Conta criada. Se a confirmação de e-mail estiver ativa, confirme no seu e-mail para entrar.");
  }
}

async function loginWithGoogle(){
  const msg = $("authMsg");
  hideMsg(msg);

  const redirectTo = window.location.origin;

  const { error } = await State.supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });

  if (error){
    showMsg(msg, `Falha no Google: ${error.message}`, true);
  }
}

async function logout(){
  const { error } = await State.supabase.auth.signOut();
  if (error){
    // se der erro, só mostra, mas o onAuthStateChange normalmente resolve
    const msg = $("authMsg");
    showMsg(msg, `Erro ao sair: ${error.message}`, true);
  }
}

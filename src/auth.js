import { supabase } from "./supabaseClient.js";
import { ui, showMsg, hideMsg, setLoggedInUI } from "./ui.js";
import { resetSessionState } from "./state.js";

export async function initAuth() {
  ui.btnLogin.addEventListener("click", loginWithEmail);
  ui.btnSignup.addEventListener("click", signupWithEmail);
  ui.btnGoogle.addEventListener("click", loginWithGoogle);
  ui.btnLogout.addEventListener("click", logout);

  const { data } = await supabase.auth.getSession();
  setLoggedInUI(data.session?.user || null);

  supabase.auth.onAuthStateChange((_event, session) => {
    // troca de usuário / logout / login
    resetSessionState();
    setLoggedInUI(session?.user || null);

    // limpa mensagens e formulário de foto para não “vazar” entre sessões
    hideMsg(ui.authMsg);
    hideMsg(ui.nestMsg);
    ui.photo.value = "";
    ui.photoName.textContent = "";
  });
}

async function loginWithEmail() {
  hideMsg(ui.authMsg);

  const email = ui.email.value.trim();
  const password = ui.password.value;

  if (!email || !password) {
    showMsg(ui.authMsg, "Informe e-mail e senha.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) showMsg(ui.authMsg, error.message);
}

async function signupWithEmail() {
  hideMsg(ui.authMsg);

  const email = ui.email.value.trim();
  const password = ui.password.value;

  if (!email || !password) {
    showMsg(ui.authMsg, "Informe e-mail e senha.");
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showMsg(ui.authMsg, error.message);
    return;
  }

  showMsg(ui.authMsg, "Conta criada! Se o Supabase exigir confirmação, verifique seu e-mail.");
}

async function loginWithGoogle() {
  hideMsg(ui.authMsg);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) showMsg(ui.authMsg, error.message);
}

async function logout() {
  await supabase.auth.signOut();
}

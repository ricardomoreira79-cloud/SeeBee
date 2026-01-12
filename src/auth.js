import { supabase } from "./supabaseClient.js";
import { ui, showMsg, hideMsg, setLoggedInUI, closeDrawer, showView, setActiveNav } from "./ui.js";
import { resetSessionState } from "./state.js";

export async function initAuth() {
  ui.btnLogin.addEventListener("click", loginWithEmail);
  ui.btnSignup.addEventListener("click", signupWithEmail);
  ui.btnGoogle.addEventListener("click", loginWithGoogle);
  ui.btnLogout.addEventListener("click", logout);

  const { data } = await supabase.auth.getSession();
  setLoggedInUI(data.session?.user || null);

  supabase.auth.onAuthStateChange((_event, session) => {
    resetSessionState();
    setLoggedInUI(session?.user || null);

    hideMsg(ui.authMsg);
    hideMsg(ui.nestMsg);

    // fecha menu e volta pro trajeto
    closeDrawer();
    showView("home");
    setActiveNav("home");
  });
}

async function loginWithEmail() {
  hideMsg(ui.authMsg);
  const email = ui.email.value.trim();
  const password = ui.password.value;

  if (!email || !password) return showMsg(ui.authMsg, "Informe e-mail e senha.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) showMsg(ui.authMsg, error.message);
}

async function signupWithEmail() {
  hideMsg(ui.authMsg);
  const email = ui.email.value.trim();
  const password = ui.password.value;

  if (!email || !password) return showMsg(ui.authMsg, "Informe e-mail e senha.");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return showMsg(ui.authMsg, error.message);

  showMsg(ui.authMsg, "Conta criada! Se o Supabase exigir confirmação, verifique seu e-mail.");
}

async function loginWithGoogle() {
  hideMsg(ui.authMsg);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });

  if (error) showMsg(ui.authMsg, error.message);
}

async function logout() {
  await supabase.auth.signOut();
}

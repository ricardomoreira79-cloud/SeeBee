import { supabase } from "./supabaseClient.js";
import { state } from "./state.js";
import { showAuthView, showAppView, setMsg, $ } from "./ui.js";

export function bindAuthUI() {
  const loginForm = $("loginForm");
  const signupForm = $("signupForm");

  $("btnGoSignup").addEventListener("click", () => {
    signupForm.hidden = false;
    loginForm.hidden = true;
    setMsg($("authMsg"), "");
  });

  $("btnBackLogin").addEventListener("click", () => {
    signupForm.hidden = true;
    loginForm.hidden = false;
    setMsg($("signupMsg"), "");
  });

  $("btnGoogle").addEventListener("click", async () => {
    setMsg($("authMsg"), "Redirecionando para Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setMsg($("authMsg"), error.message, "error");
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg($("authMsg"), "Entrando...");

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg($("authMsg"), error.message, "error");

    state.session = data.session;
    showAppView();
    setMsg($("authMsg"), "");
  });

  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg($("signupMsg"), "Criando conta...");

    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return setMsg($("signupMsg"), error.message, "error");

    // Se o Supabase estiver com confirmação de e-mail ligada, session pode vir null.
    if (data?.session) {
      state.session = data.session;
      showAppView();
      setMsg($("signupMsg"), "");
      return;
    }

    setMsg(
      $("signupMsg"),
      "Conta criada! Se a confirmação de e-mail estiver ativada no Supabase, confirme no e-mail e depois faça login.",
      "ok"
    );
  });

  $("btnLogout").addEventListener("click", logout);
}

export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  if (state.session) showAppView();
  else showAuthView();

  // Mantém UI sincronizada com mudanças de sessão (OAuth/refresh etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    if (session) showAppView();
    else showAuthView();
  });
}

export async function logout() {
  await supabase.auth.signOut();
  state.session = null;
  showAuthView();
}

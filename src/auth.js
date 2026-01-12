import { ui, toast, showApp, showAuth, setHeaderUser, closeDrawer } from "./ui.js";
import { state, resetSessionState } from "./state.js";

export function bindAuth(supabase, onLoggedIn) {
  ui.btnLogin.addEventListener("click", async () => {
    const email = ui.authEmail.value.trim();
    const password = ui.authPass.value.trim();
    if (!email || !password) return toast(ui.authMsg, "Informe e-mail e senha.", "error");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toast(ui.authMsg, error.message, "error");

    state.user = data.user;
    setHeaderUser(state.user?.email);
    showApp();
    closeDrawer();
    await onLoggedIn();
  });

  ui.btnSignup.addEventListener("click", async () => {
    const email = ui.authEmail.value.trim();
    const password = ui.authPass.value.trim();
    if (!email || !password) return toast(ui.authMsg, "Informe e-mail e senha.", "error");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return toast(ui.authMsg, error.message, "error");

    toast(ui.authMsg, "Conta criada. Se o Supabase pedir confirmação por e-mail, confirme e depois entre.", "ok");
  });

  ui.btnGoogle.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) return toast(ui.authMsg, error.message, "error");
  });

  ui.btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    state.user = null;
    resetSessionState();
    showAuth();
    closeDrawer();
  });

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;
    if (state.user) {
      setHeaderUser(state.user.email);
      showApp();
      await onLoggedIn();
    } else {
      showAuth();
    }
  });
}

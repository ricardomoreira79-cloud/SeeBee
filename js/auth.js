import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { setAuthMessage, showAppScreen, showAuthScreen } from "./ui.js";

// ✅ Mantém o mesmo cliente, mas agora vamos tratar o retorno OAuth com hash também.
export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _oauthUrlHandled = false;

function _cleanOAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    const keys = ["code", "error", "error_description", "error_code", "type", "provider_token", "provider_refresh_token"];
    let changed = false;
    keys.forEach((k) => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    });
    if (changed) window.history.replaceState({}, document.title, url.toString());
  } catch (_) {}
}

function _cleanOAuthHashFromUrl() {
  try {
    if (!window.location.hash) return;
    const raw = String(window.location.hash || "").replace(/^#/, "");
    if (!raw) return;

    const p = new URLSearchParams(raw);
    const keys = [
      "access_token",
      "refresh_token",
      "token_type",
      "expires_in",
      "expires_at",
      "provider_token",
      "provider_refresh_token",
      "error",
      "error_description",
      "error_code",
      "type",
    ];

    let changed = false;
    keys.forEach((k) => {
      if (p.has(k)) {
        p.delete(k);
        changed = true;
      }
    });

    if (!changed) return;

    const newHash = p.toString();
    const newUrl = window.location.pathname + window.location.search + (newHash ? `#${newHash}` : "");
    window.history.replaceState({}, document.title, newUrl);
  } catch (_) {}
}

/**
 * ✅ Trata callback OAuth:
 * - Se voltar por ?code=... (PKCE): exchangeCodeForSession
 * - Se voltar por #access_token=... (implicit/token): setSession
 * E limpa a URL para não ficar “reprocessando”.
 */
async function _handleOAuthRedirectIfNeeded() {
  if (_oauthUrlHandled) return;
  _oauthUrlHandled = true;

  // 1) Se veio por QUERY (?code=...)
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const qError = url.searchParams.get("error") || url.searchParams.get("error_code");
  const qErrorDesc = url.searchParams.get("error_description");

  // 2) Se veio por HASH (#access_token=...)
  const hash = String(window.location.hash || "").replace(/^#/, "");
  const hp = new URLSearchParams(hash);
  const hAccess = hp.get("access_token");
  const hRefresh = hp.get("refresh_token");
  const hError = hp.get("error") || hp.get("error_code");
  const hErrorDesc = hp.get("error_description");

  // Erros do retorno OAuth (query/hash)
  if (qError || hError) {
    console.error("OAuth error:", qError || hError, qErrorDesc || hErrorDesc);
    setAuthMessage(decodeURIComponent((qErrorDesc || hErrorDesc || "Falha no login OAuth.") + ""), true);
    _cleanOAuthParamsFromUrl();
    _cleanOAuthHashFromUrl();
    return;
  }

  // PKCE (code)
  if (code) {
    try {
      setAuthMessage("Finalizando login...");
      const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setAuthMessage("Não foi possível finalizar o login. Tente novamente.", true);
    } finally {
      _cleanOAuthParamsFromUrl();
      _cleanOAuthHashFromUrl();
    }
    return;
  }

  // Implicit/token (hash)
  if (hAccess && hRefresh) {
    try {
      setAuthMessage("Finalizando login...");
      const { error } = await supabaseClient.auth.setSession({
        access_token: hAccess,
        refresh_token: hRefresh,
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setAuthMessage("Não foi possível finalizar o login (token). Tente novamente.", true);
    } finally {
      _cleanOAuthParamsFromUrl();
      _cleanOAuthHashFromUrl();
    }
  }
}

export async function signUp(email, password) {
  setAuthMessage("Criando conta...");
  if (!email || !password) return setAuthMessage("Preencha e-mail e senha.", true);

  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return setAuthMessage(error.message, true);

  setAuthMessage("Conta criada! Agora clique em Entrar.", false);
}

export async function signIn(email, password) {
  setAuthMessage("Entrando...");
  if (!email || !password) return setAuthMessage("Preencha e-mail e senha.", true);

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage(error.message, true);

  setAuthMessage("");
  await checkSessionAndRoute();
}

export async function signInWithGoogle() {
  setAuthMessage("Conectando ao Google...");
  try {
    // ✅ Força redirectTo para a raiz do seu app (Vercel)
    // (mantém o comportamento e evita “voltar” em rota/fragmento estranho)
    const redirectTo = `${window.location.origin}/`;

    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  } catch (e) {
    console.error(e);
    setAuthMessage("Erro ao iniciar login com Google.", true);
  }
}

export async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.reload();
}

export async function checkSessionAndRoute() {
  // ✅ Garante que qualquer retorno OAuth seja processado antes do getSession()
  await _handleOAuthRedirectIfNeeded();

  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (session) {
    showAppScreen(session.user?.email || "");
    return { logged: true, session };
  } else {
    showAuthScreen();
    return { logged: false, session: null };
  }
}

export function onAuthChange(handler) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      localStorage.clear();
      window.location.reload();
    }
    handler?.(event, session);
  });
}

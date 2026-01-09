export function renderAuthScreen() {
  return `
    <div class="shell">
      <div style="margin-top:28px; display:flex; flex-direction:column; align-items:center; gap:10px;">
        <div class="brand-bee" style="width:96px;height:96px;font-size:46px;border-radius:50%;">🐝</div>
        <div style="font-size:2rem;font-weight:900;letter-spacing:.12em;">SeeBee</div>
      </div>

      <div class="card" style="max-width:420px;margin:22px auto 0;">
        <h3 style="margin:0 0 10px;">Entrar</h3>

        <div class="field">
          <label for="auth-email">E-mail</label>
          <input id="auth-email" type="email" autocomplete="email"
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(75,85,99,.8);background:rgba(2,6,23,.6);color:var(--text);" />
        </div>

        <div class="field">
          <label for="auth-password">Senha</label>
          <input id="auth-password" type="password" autocomplete="current-password"
            style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(75,85,99,.8);background:rgba(2,6,23,.6);color:var(--text);" />
        </div>

        <div class="controls" style="grid-template-columns:1fr 1fr;">
          <button class="btn btn-start" id="btn-signin">Entrar</button>
          <button class="btn btn-secondary" id="btn-signup">Criar conta</button>
        </div>

        <button class="btn btn-secondary" id="btn-google" style="margin-top:8px;">
          <span style="width:18px;height:18px;border-radius:4px;background:conic-gradient(from 45deg,#4285f4 0 25%,#34a853 25% 50%,#fbbc05 50% 75%,#ea4335 75% 100%);"></span>
          <span>Entrar com Google</span>
        </button>

        <div id="auth-msg" style="margin-top:10px;min-height:18px;font-size:.85rem;color:var(--muted);"></div>
      </div>
    </div>
  `;
}

export function renderAppShell() {
  return `
    <div class="shell">
      <div class="topbar">
        <button class="icon-btn" id="btn-open-drawer">☰</button>

        <div class="brand-center">
          <div class="brand-title">SeeBee</div>
          <div class="brand-sub">Rastreador de ninhos</div>
        </div>

        <div class="brand-bee" title="SeeBee">🐝</div>
      </div>

      <div class="netbar">
        <div class="status-pill" id="status-pill">
          <span class="dot"></span>
          <span id="net-text">Trabalhando online</span>
        </div>
      </div>

      <div class="grid">
        <section class="card">
          <h3>Trajeto <span class="badge" id="badge-status">Parado</span></h3>
          <p class="subtitle">Grave o caminho e marque ninhos com comentário e foto.</p>

          <div class="controls">
            <button class="btn btn-start" id="btn-toggle-route">
              <span id="btn-toggle-icon">▶</span>
              <span id="btn-toggle-text">Iniciar</span>
            </button>

            <button class="btn btn-secondary" id="btn-add-nest" disabled>🐝 Marcar ninho</button>
          </div>

          <div class="info-row">
            <span class="pill" id="info-route">Trajeto: —</span>
            <span class="pill" id="info-distance">Distância: 0 m</span>
            <span class="pill" id="info-nests">Ninhos: 0</span>
            <span class="pill" id="info-gps">GPS: aguardando…</span>
          </div>
        </section>

        <section class="card">
          <h3>Mapa</h3>
          <p class="subtitle">Acompanhe o trajeto e visualize os ninhos marcados.</p>
          <div id="map"></div>
        </section>
      </div>

      <section class="routes">
        <div class="routes-head">
          <h3>Trilhas gravadas</h3>
          <button class="btn-xs" id="btn-refresh">Atualizar</button>
        </div>
        <div id="routes-list"></div>
      </section>

      <div id="drawer-root"></div>
      <div id="nest-modal-root"></div>
      <div id="photo-modal-root"></div>
      <div id="toast" class="toast"></div>
    </div>
  `;
}
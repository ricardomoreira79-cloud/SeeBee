export function renderDrawer(email = "") {
  return `
    <div class="drawer-backdrop" id="drawer-backdrop">
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <div>
            <div style="font-weight:900;">Menu</div>
            <div class="drawer-user">${email ? email : ""}</div>
          </div>
          <button class="icon-btn" id="btn-close-drawer">✕</button>
        </div>

        <div class="drawer-menu">
          <div class="menu-item" id="menu-tracker">
            <div class="menu-title">Rastreador</div>
            <div class="menu-sub">Gravar trilhas e marcar ninhos</div>
          </div>

          <div class="menu-item" id="menu-profile">
            <div class="menu-title">Perfil</div>
            <div class="menu-sub">Dados do usuário (próximo passo)</div>
          </div>

          <div class="menu-item" id="menu-colonies">
            <div class="menu-title">Colônias</div>
            <div class="menu-sub">Cadastro de colônias (próximo passo)</div>
          </div>

          <div class="menu-item" id="menu-logout">
            <div class="menu-title">Sair</div>
            <div class="menu-sub">Encerrar sessão</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function openDrawer() {
  const backdrop = document.getElementById("drawer-backdrop");
  if (!backdrop) return;
  backdrop.classList.add("open");
}

export function closeDrawer() {
  const backdrop = document.getElementById("drawer-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
}
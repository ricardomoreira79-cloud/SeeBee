import { openPhoto } from "./photoModal.js";

export function renderRoutesList(container, routes, { onView, onRename, onDelete } = {}) {
  container.innerHTML = "";

  if (!routes.length) {
    const div = document.createElement("div");
    div.className = "route-empty";
    div.textContent = "Nenhuma trilha gravada ainda.";
    container.appendChild(div);
    return;
  }

  for (const route of routes) {
    const card = document.createElement("div");
    card.className = "route-card";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.className = "route-title";
    title.textContent = route.name || "Trilha sem nome";
    left.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "route-meta";

    const d = new Date(route.created_at || Date.now());
    const dist = route.totalDistance || 0;

    // tentativa de mostrar início/fim com base no path
    const start = route.path?.[0]?.t ? new Date(route.path[0].t) : null;
    const end = route.path?.at?.(-1)?.t ? new Date(route.path.at(-1).t) : null;

    meta.textContent =
      `${d.toLocaleDateString("pt-BR")} · ` +
      `${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · ` +
      `${dist.toFixed(dist>1000?1:0)} m · ` +
      `${(route.nests?.length||0)} ninhos` +
      (start && end ? ` · ${start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}-${end.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}` : "");

    if (!route.id) {
      const warn = document.createElement("span");
      warn.className = "sync-warn";
      warn.textContent = " · não sincronizada";
      meta.appendChild(warn);
    }

    left.appendChild(meta);

    // thumbs
    const thumbs = document.createElement("div");
    thumbs.className = "thumbs";

    (route.nests || []).forEach(n => {
      if (!n.photoUrl && !n.photoLocalKey) return;
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = n.photoUrl || "";
      img.alt = "Foto do ninho";

      // se for local, não dá pra setar src direto; abre no modal
      if (n.photoLocalKey) img.style.opacity = ".9";

      img.addEventListener("click", async () => {
        await openPhoto(n.photoUrl || n.photoLocalKey);
      });

      // se for localKey, deixa o preview sem src (fica “vazio”), mas clicável
      if (n.photoLocalKey && !n.photoUrl) {
        img.src = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="10">offline</text></svg>`);
      }

      thumbs.appendChild(img);
    });

    if (thumbs.childElementCount) left.appendChild(thumbs);

    const right = document.createElement("div");
    right.className = "route-actions";

    const btnView = document.createElement("button");
    btnView.className = "btn-xs";
    btnView.textContent = "Ver no mapa";
    btnView.onclick = () => onView && onView(route);
    right.appendChild(btnView);

    const btnRen = document.createElement("button");
    btnRen.className = "btn-xs";
    btnRen.textContent = "Renomear";
    btnRen.onclick = () => onRename && onRename(route);
    right.appendChild(btnRen);

    const btnDel = document.createElement("button");
    btnDel.className = "btn-xs danger";
    btnDel.textContent = "Excluir";
    btnDel.onclick = () => onDelete && onDelete(route);
    right.appendChild(btnDel);

    card.appendChild(left);
    card.appendChild(right);

    container.appendChild(card);
  }
}
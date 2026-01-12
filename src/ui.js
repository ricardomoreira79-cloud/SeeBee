export function $(id){ return document.getElementById(id); }

export function setBodyGuest(isGuest){
  document.body.classList.toggle("guest", isGuest);
}

export function showMsg(el, text, isError=false){
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle("error", !!isError);
}

export function hideMsg(el){
  el.hidden = true;
  el.textContent = "";
  el.classList.remove("error");
}

export function setLoggedUI({ userEmail }){
  $("authCard").hidden = true;
  $("appArea").hidden = false;
  $("userbar").hidden = false;
  $("userEmail").textContent = userEmail || "";
  setBodyGuest(false);
}

export function setGuestUI(){
  $("authCard").hidden = false;
  $("appArea").hidden = true;
  $("userbar").hidden = true;
  setBodyGuest(true);
}

export function renderThumbs(items){
  const box = $("thumbs");
  box.innerHTML = "";

  if (!items.length){
    box.innerHTML = `<div class="muted">Nenhum ninho marcado ainda nesta trilha.</div>`;
    return;
  }

  for (const it of items){
    const div = document.createElement("div");
    div.className = "thumb";
    const img = it.photo_url
      ? `<img src="${it.photo_url}" alt="Foto do ninho">`
      : `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder())}" alt="Sem foto">`;
    div.innerHTML = `
      ${img}
      <div class="cap">
        <div><b>${it.status}</b></div>
        <div>${escapeHtml(it.note || "—")}</div>
      </div>
    `;
    box.appendChild(div);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function svgPlaceholder(){
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#0b1220"/>
        <stop offset="1" stop-color="#0a1b33"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      fill="rgba(233,241,255,.55)" font-size="20" font-family="Arial">
      Sem foto
    </text>
  </svg>`;
}

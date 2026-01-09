import { idbGetPhoto } from "../services/idbService.js";

export function renderPhotoModal() {
  return `
    <div class="photo-modal" id="photo-modal">
      <button class="photo-close" id="photo-close">Fechar</button>
      <img id="photo-img" alt="Foto" />
    </div>
  `;
}

export async function openPhoto(srcOrLocalKey) {
  const modal = document.getElementById("photo-modal");
  const img = document.getElementById("photo-img");
  if (!modal || !img) return;

  // se veio localKey
  if (srcOrLocalKey && srcOrLocalKey.startsWith("photo_")) {
    const item = await idbGetPhoto(srcOrLocalKey);
    if (item?.blob) {
      img.src = URL.createObjectURL(item.blob);
    } else {
      img.src = "";
    }
  } else {
    img.src = srcOrLocalKey || "";
  }

  modal.style.display = "flex";
}

export function bindPhotoModal() {
  const modal = document.getElementById("photo-modal");
  const close = document.getElementById("photo-close");
  const img = document.getElementById("photo-img");
  if (!modal || !close || !img) return;

  function shut() {
    modal.style.display = "none";
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    img.src = "";
  }

  close.addEventListener("click", shut);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) shut();
  });
}
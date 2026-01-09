export function renderNestModal() {
  return `
    <div class="modal-backdrop" id="nest-modal">
      <div class="modal">
        <h4>Marcar ninho</h4>
        <p>Escreva uma observação e tire/seleciona uma foto (opcional).</p>

        <div class="field">
          <label for="nest-notes">Observações</label>
          <textarea id="nest-notes" placeholder="Ex.: perto da árvore grande, rua 14…"></textarea>
        </div>

        <div class="field">
          <label>Foto (opcional)</label>
          <label class="file-pill">
            📷 <span>Selecionar/tirar foto</span>
            <input id="nest-file" type="file" accept="image/*" capture="environment" />
          </label>
          <span class="file-name" id="nest-file-name"></span>
        </div>

        <div class="modal-actions">
          <button class="btn-sm" id="nest-cancel">Cancelar</button>
          <button class="btn-sm primary" id="nest-save">Salvar</button>
        </div>
      </div>
    </div>
  `;
}

export function openNestModal() {
  const modal = document.getElementById("nest-modal");
  const notes = document.getElementById("nest-notes");
  const file = document.getElementById("nest-file");
  const fileName = document.getElementById("nest-file-name");

  if (!modal || !notes || !file || !fileName) return Promise.resolve(null);

  notes.value = "";
  file.value = "";
  fileName.textContent = "";
  modal.style.display = "flex";

  return new Promise((resolve) => {
    const cancel = document.getElementById("nest-cancel");
    const save = document.getElementById("nest-save");

    function cleanup(result) {
      modal.style.display = "none";
      cancel.removeEventListener("click", onCancel);
      save.removeEventListener("click", onSave);
      file.removeEventListener("change", onFile);
      resolve(result);
    }

    function onCancel() { cleanup(null); }
    function onSave() {
      cleanup({
        description: notes.value.trim(),
        file: file.files?.[0] || null,
      });
    }
    function onFile() {
      const f = file.files?.[0];
      fileName.textContent = f ? f.name : "";
    }

    cancel.addEventListener("click", onCancel);
    save.addEventListener("click", onSave);
    file.addEventListener("change", onFile);
  });
}
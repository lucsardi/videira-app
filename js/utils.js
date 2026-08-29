// ============================================
// FUNÇÕES DE APOIO PARA DATAS
// ============================================

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function nomeDoMes(mes) {
  return MESES[mes - 1] || "";
}

// Retorna quantos dias faltam até o próximo dia/mês informado (0 = hoje)
function diasAte(dia, mes, hoje = new Date()) {
  const anoAtual = hoje.getFullYear();
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  let alvo = new Date(anoAtual, mes - 1, dia);
  if (alvo < h) {
    alvo = new Date(anoAtual + 1, mes - 1, dia);
  }
  const diffMs = alvo.getTime() - h.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function ehHoje(dia, mes, hoje = new Date()) {
  return dia === hoje.getDate() && mes === hoje.getMonth() + 1;
}

// Pequeno "escape" para não quebrar o HTML quando o nome tiver < > & etc.
function escapeHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

// Monta um avatar circular: foto se tiver, senão a inicial do nome
function avatarHtml(p, classeExtra = "") {
  if (p.photo_url) {
    return `<img src="${escapeHtml(p.photo_url)}" class="vd-avatar ${classeExtra}" alt="">`;
  }
  const iniciais = (p.full_name || "?").trim().charAt(0).toUpperCase();
  return `<div class="vd-avatar ${classeExtra}">${iniciais}</div>`;
}

// ============================================
// Modal de confirmação reutilizável (substitui o confirm() do navegador)
// Uso: const ok = await confirmarAcao("Título", "Mensagem...", "Excluir", "danger");
// ============================================
function confirmarAcao(titulo, mensagem, textoConfirmar = "Confirmar", variante = "primary") {
  return new Promise((resolve) => {
    let modalEl = document.getElementById("modalConfirmacao");
    if (!modalEl) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal fade" id="modalConfirmacao" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="border-radius: 20px;">
              <div class="modal-body p-4 text-center">
                <div id="confirmTitulo" class="h6 fw-bold mb-2"></div>
                <p id="confirmMensagem" class="text-muted small mb-4"></p>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="modal">Cancelar</button>
                  <button type="button" class="btn flex-fill" id="confirmOk">Confirmar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `);
      modalEl = document.getElementById("modalConfirmacao");
    }

    document.getElementById("confirmTitulo").textContent = titulo;
    document.getElementById("confirmMensagem").textContent = mensagem;

    let btnOk = document.getElementById("confirmOk");
    // Troca o botão por um novo para não acumular listeners de chamadas anteriores
    const btnNovo = btnOk.cloneNode(true);
    btnOk.parentNode.replaceChild(btnNovo, btnOk);
    btnNovo.textContent = textoConfirmar;
    btnNovo.className = `btn flex-fill btn-${variante}`;

    const modal = new bootstrap.Modal(modalEl);

    btnNovo.addEventListener("click", () => {
      modal.hide();
      resolve(true);
    });

    modalEl.addEventListener("hidden.bs.modal", () => resolve(false), { once: true });

    modal.show();
  });
}

// Pequeno "toast" de feedback (canto inferior, some sozinho)
function mostrarToast(mensagem, variante = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="toastContainer" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1200;"></div>
    `);
    container = document.getElementById("toastContainer");
  }
  const id = "toast" + Date.now();
  container.insertAdjacentHTML("beforeend", `
    <div id="${id}" class="toast align-items-center text-white bg-${variante} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(mensagem)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);
  const toastEl = document.getElementById(id);
  const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

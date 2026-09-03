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

// Monta um link absoluto para outra página deste site, robusto a URLs "limpas"
// (sem .html) como as que a Vercel gera. Ex: linkAbsoluto("convite.html", {token: "abc"})
function linkAbsoluto(arquivo, params = {}) {
  const caminho = window.location.pathname;
  const pasta = caminho.substring(0, caminho.lastIndexOf("/") + 1);
  const query = new URLSearchParams(params).toString();
  return `${window.location.origin}${pasta}${arquivo}${query ? "?" + query : ""}`;
}

// Monta um avatar circular: foto se tiver, senão a inicial do nome
function avatarHtml(p, classeExtra = "") {
  if (p.photo_url) {
    return `<img src="${escapeHtml(p.photo_url)}" class="vd-avatar ${classeExtra}" alt="">`;
  }
  const iniciais = (p.full_name || "?").trim().charAt(0).toUpperCase();
  return `<div class="vd-avatar ${classeExtra}">${iniciais}</div>`;
}

// Avatar "de casal": duas fotos sobrepostas quando o cônjuge também está
// cadastrado; se não tiver segunda pessoa, mostra só o avatar normal.
function avatarCasalHtml(p1, p2) {
  if (!p2) return avatarHtml(p1);
  return `
    <div class="d-flex align-items-center flex-shrink-0" style="width: 58px;">
      <div style="position: relative; z-index: 2; border-radius: 50%; box-shadow: 0 0 0 2px var(--vd-surface);">
        ${avatarHtml(p1)}
      </div>
      <div style="position: relative; z-index: 1; margin-left: -16px; border-radius: 50%; box-shadow: 0 0 0 2px var(--vd-surface);">
        ${avatarHtml(p2)}
      </div>
    </div>
  `;
}

// Junta uma lista já filtrada (ex: "casamentos hoje") em casais, evitando mostrar
// a mesma união duas vezes quando as duas pessoas estão cadastradas e vinculadas.
// listaCompleta é usada só pra encontrar os dados do cônjuge (foto, etc).
function agruparCasais(subconjunto, listaCompleta) {
  const porId = new Map(listaCompleta.map((p) => [p.id, p]));
  const vistos = new Set();
  const casais = [];

  subconjunto.forEach((p) => {
    if (vistos.has(p.id)) return;
    const conjugePessoa = p.spouse_id ? porId.get(p.spouse_id) : null;
    if (conjugePessoa) vistos.add(conjugePessoa.id);
    vistos.add(p.id);
    casais.push({ pessoa: p, conjugePessoa: conjugePessoa || null });
  });

  return casais;
}

// Quando alguém cadastra o aniversário de casamento e vincula o cônjuge a uma
// pessoa que também está cadastrada no sistema (spouse_id), essa função "empresta"
// os dados do casamento para o registro do cônjuge também — sem precisar
// cadastrar a mesma informação duas vezes. Só mexe nos dados em memória
// (não grava nada no banco), então é seguro chamar sempre que exibir uma lista.
function aplicarCasamentosVinculados(pessoas) {
  const porId = new Map(pessoas.map((p) => [p.id, p]));

  pessoas.forEach((p) => {
    if (p.wedding_day && p.wedding_month && p.spouse_id) {
      const conjuge = porId.get(p.spouse_id);
      if (conjuge && !(conjuge.wedding_day && conjuge.wedding_month)) {
        conjuge.wedding_day = p.wedding_day;
        conjuge.wedding_month = p.wedding_month;
        conjuge.spouse_name = conjuge.spouse_name || p.full_name;
        conjuge.spouse_id = conjuge.spouse_id || p.id;
      }
    }
  });

  return pessoas;
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

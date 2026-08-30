// ============================================
// PÁGINA: conexoes.html (somente admin)
// ============================================

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("conexoes.html");
  if (!menu?.ehAdmin) {
    window.location.href = "index.html";
    return;
  }

  await carregarConexoes();

  document.getElementById("formNovaConexao").addEventListener("submit", adicionarConexao);

  document.getElementById("listaConexoes").addEventListener("click", (e) => {
    const btnRenomear = e.target.closest("[data-renomear-id]");
    if (btnRenomear) renomearConexao(btnRenomear.dataset.renomearId, btnRenomear.dataset.renomearNome);

    const btnExcluir = e.target.closest("[data-excluir-id]");
    if (btnExcluir) excluirConexao(btnExcluir.dataset.excluirId, btnExcluir.dataset.excluirNome);
  });
})();

async function carregarConexoes() {
  const { data: conexoes, error } = await sb.from("connections").select("*").order("name");
  const container = document.getElementById("listaConexoes");

  if (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!conexoes || conexoes.length === 0) {
    container.innerHTML = `<div class="text-muted small">Nenhuma conexão cadastrada.</div>`;
    return;
  }

  // Busca a contagem de pessoas por conexão (uma query só, agrupada no navegador)
  const { data: pessoas } = await sb.from("people").select("connection_id");
  const contagens = {};
  (pessoas || []).forEach((p) => {
    if (p.connection_id) contagens[p.connection_id] = (contagens[p.connection_id] || 0) + 1;
  });

  container.innerHTML = conexoes.map((c) => {
    const total = contagens[c.id] || 0;
    return `
    <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
      <a href="conexao-detalhe.html?id=${c.id}" class="text-decoration-none flex-grow-1" style="color: inherit; min-width: 0;">
        <div class="fw-semibold">${escapeHtml(c.name)}</div>
        <div class="small text-muted">${total} pessoa${total !== 1 ? "s" : ""} cadastrada${total !== 1 ? "s" : ""}</div>
      </a>
      <div class="d-flex gap-3 flex-shrink-0">
        <button class="btn btn-link btn-sm p-0 small" data-renomear-id="${c.id}" data-renomear-nome="${escapeHtml(c.name)}">Renomear</button>
        <button class="btn btn-link btn-sm p-0 small text-danger" data-excluir-id="${c.id}" data-excluir-nome="${escapeHtml(c.name)}">Excluir</button>
      </div>
    </div>
  `;
  }).join("");
}

async function adicionarConexao(e) {
  e.preventDefault();
  const input = document.getElementById("nomeNovaConexao");
  const nome = input.value.trim();
  if (!nome) return;

  const msgErro = document.getElementById("msgErro");
  msgErro.classList.add("d-none");

  const { error } = await sb.from("connections").insert({ name: nome });
  if (error) {
    msgErro.textContent = "Não foi possível adicionar: " + error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  input.value = "";
  await carregarConexoes();
  mostrarToast("Conexão adicionada.");
}

async function renomearConexao(id, nomeAtual) {
  const novoNome = prompt("Novo nome da conexão:", nomeAtual);
  if (!novoNome || novoNome.trim() === nomeAtual) return;

  const { error } = await sb.from("connections").update({ name: novoNome.trim() }).eq("id", id);
  if (error) {
    mostrarToast("Erro ao renomear: " + error.message, "danger");
    return;
  }
  await carregarConexoes();
  mostrarToast("Conexão renomeada.");
}

async function excluirConexao(id, nome) {
  const ok = await confirmarAcao(
    "Excluir conexão",
    `Excluir a conexão "${nome}"? Os aniversariantes dela ficarão sem conexão, mas não serão apagados.`,
    "Excluir",
    "danger"
  );
  if (!ok) return;

  const { error } = await sb.from("connections").delete().eq("id", id);
  if (error) {
    mostrarToast("Erro ao excluir: " + error.message, "danger");
    return;
  }
  await carregarConexoes();
  mostrarToast("Conexão excluída.");
}

// ============================================
// PÁGINA: conexoes.html (somente admin)
// ============================================

let CONEXOES_CACHE_LISTA = []; // [{ ...conexao, total, nomesLideres }]

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
  document.getElementById("buscaConexao").addEventListener("input", renderizarLista);

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

  // Contagem de pessoas por conexão
  const { data: pessoas } = await sb.from("people").select("connection_id");
  const contagens = {};
  (pessoas || []).forEach((p) => {
    if (p.connection_id) contagens[p.connection_id] = (contagens[p.connection_id] || 0) + 1;
  });

  // Nomes dos líderes por conexão
  const { data: lideres } = await sb
    .from("connection_leaders")
    .select("connection_id, people(full_name)");
  const nomesLideresPorConexao = {};
  (lideres || []).forEach((l) => {
    if (!nomesLideresPorConexao[l.connection_id]) nomesLideresPorConexao[l.connection_id] = [];
    if (l.people?.full_name) nomesLideresPorConexao[l.connection_id].push(l.people.full_name);
  });

  CONEXOES_CACHE_LISTA = (conexoes || []).map((c) => ({
    ...c,
    total: contagens[c.id] || 0,
    nomesLideres: nomesLideresPorConexao[c.id] || [],
  }));

  renderizarLista();
}

function renderizarLista() {
  const busca = (document.getElementById("buscaConexao").value || "").trim().toLowerCase();
  const container = document.getElementById("listaConexoes");

  const filtradas = busca
    ? CONEXOES_CACHE_LISTA.filter((c) => c.name.toLowerCase().includes(busca))
    : CONEXOES_CACHE_LISTA;

  if (CONEXOES_CACHE_LISTA.length === 0) {
    container.innerHTML = `<div class="text-muted small">Nenhuma conexão cadastrada.</div>`;
    return;
  }

  if (filtradas.length === 0) {
    container.innerHTML = `<div class="text-muted small">Nenhuma conexão encontrada para "${escapeHtml(busca)}".</div>`;
    return;
  }

  container.innerHTML = filtradas.map((c) => `
    <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
      <a href="conexao-detalhe.html?id=${c.id}" class="text-decoration-none flex-grow-1" style="color: inherit; min-width: 0;">
        <div class="fw-semibold">${escapeHtml(c.name)}</div>
        <div class="small text-muted">${c.total} pessoa${c.total !== 1 ? "s" : ""} cadastrada${c.total !== 1 ? "s" : ""}</div>
        ${c.nomesLideres.length > 0
          ? `<div class="small text-muted">👤 ${c.nomesLideres.map(escapeHtml).join(", ")}</div>`
          : `<div class="small text-muted fst-italic">Sem líder definido</div>`}
      </a>
      <div class="d-flex gap-3 flex-shrink-0">
        <button class="btn btn-link btn-sm p-0 small" data-renomear-id="${c.id}" data-renomear-nome="${escapeHtml(c.name)}">Renomear</button>
        <button class="btn btn-link btn-sm p-0 small text-danger" data-excluir-id="${c.id}" data-excluir-nome="${escapeHtml(c.name)}">Excluir</button>
      </div>
    </div>
  `).join("");
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

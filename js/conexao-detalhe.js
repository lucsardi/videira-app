// ============================================
// PÁGINA: conexao-detalhe.html?id=... (somente admin)
// ============================================

const idConexao = new URLSearchParams(window.location.search).get("id");
let TODAS_PESSOAS_PARA_LIDER = [];

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("conexoes.html");
  if (!menu?.ehAdmin) {
    window.location.href = "index.html";
    return;
  }

  const container = document.getElementById("conteudoConexao");

  if (!idConexao) {
    window.location.href = "conexoes.html";
    return;
  }

  const { data: conexao, error: erroConexao } = await sb
    .from("connections")
    .select("*")
    .eq("id", idConexao)
    .single();

  if (erroConexao || !conexao) {
    container.innerHTML = `<div class="alert alert-warning">Conexão não encontrada.</div>`;
    return;
  }

  const { data: pessoas, error: erroPessoas } = await sb
    .from("people")
    .select("*")
    .eq("connection_id", idConexao)
    .order("full_name");

  if (erroPessoas) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar pessoas: ${escapeHtml(erroPessoas.message)}</div>`;
    return;
  }

  const { data: todasPessoas } = await sb
    .from("people")
    .select("id, full_name")
    .order("full_name");
  TODAS_PESSOAS_PARA_LIDER = todasPessoas || [];

  const lista = pessoas || [];
  const proximoTexto = (p) => {
    const dias = ehHoje(p.birth_day, p.birth_month) ? 0 : diasAte(p.birth_day, p.birth_month);
    if (dias === 0) return '<span class="badge badge-hoje">Hoje</span>';
    if (dias === 1) return '<span class="badge badge-amanha">Amanhã</span>';
    if (dias <= 7) return `<span class="badge badge-em-dias">Em ${dias} dias</span>`;
    return "";
  };

  container.innerHTML = `
    <div class="mb-4">
      <h1 class="h4 fw-bold mb-0">🌿 ${escapeHtml(conexao.name)}</h1>
      <p class="text-muted small mb-0">${lista.length} pessoa${lista.length !== 1 ? "s" : ""} cadastrada${lista.length !== 1 ? "s" : ""}</p>
    </div>

    <div class="card p-3 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h6 fw-bold mb-0">Líderes desta conexão</h2>
        <span class="small text-muted" id="contadorLideres"></span>
      </div>
      <div id="listaLideres">
        <div class="text-muted small">Carregando...</div>
      </div>
      <div class="mt-2" id="blocoAdicionarLider"></div>
    </div>

    <h2 class="h6 fw-bold mb-2">Pessoas da conexão</h2>
    ${lista.length === 0
      ? `<div class="card p-3 text-muted small">Ninguém cadastrado nessa conexão ainda.</div>`
      : lista.map((p) => `
        <a href="detalhe.html?id=${p.id}" class="text-decoration-none" style="color: inherit;">
          <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2" style="min-width: 0;">
              ${avatarHtml(p)}
              <div style="min-width: 0;">
                <div class="fw-semibold">
                  ${escapeHtml(p.full_name)}
                  ${p.is_leader ? '<span class="badge badge-lider ms-1">Líder/Pastor</span>' : ""}
                </div>
                <div class="small text-muted">🎂 ${p.birth_day} de ${nomeDoMes(p.birth_month)}</div>
              </div>
            </div>
            <div class="flex-shrink-0 ms-2">${proximoTexto(p)}</div>
          </div>
        </a>
      `).join("")}
  `;

  await carregarLideres();
})();

async function carregarLideres() {
  const { data: lideres, error } = await sb
    .from("connection_leaders")
    .select("id, person_id, people(id, full_name, photo_url)")
    .eq("connection_id", idConexao)
    .order("created_at");

  const listaEl = document.getElementById("listaLideres");
  const contadorEl = document.getElementById("contadorLideres");
  const blocoAdicionar = document.getElementById("blocoAdicionarLider");

  if (error) {
    listaEl.innerHTML = `<div class="text-danger small">Erro ao carregar líderes: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const lista = lideres || [];
  contadorEl.textContent = `${lista.length}/4`;

  if (lista.length === 0) {
    listaEl.innerHTML = `<div class="text-muted small mb-2">Nenhum líder definido ainda.</div>`;
  } else {
    listaEl.innerHTML = lista.map((l) => `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <a href="detalhe.html?id=${l.people.id}" class="d-flex align-items-center gap-2 text-decoration-none" style="color: inherit; min-width: 0;">
          ${avatarHtml(l.people)}
          <span class="fw-semibold small">${escapeHtml(l.people.full_name)}</span>
        </a>
        <button class="btn btn-link btn-sm text-danger p-0 small flex-shrink-0" data-remover-lider="${l.id}" data-remover-nome="${escapeHtml(l.people.full_name)}">Remover</button>
      </div>
    `).join("");

    listaEl.querySelectorAll("[data-remover-lider]").forEach((btn) => {
      btn.addEventListener("click", () => removerLider(btn.dataset.removerLider, btn.dataset.removerNome));
    });
  }

  // Bloco de adicionar (só aparece se ainda não chegou em 4)
  if (lista.length >= 4) {
    blocoAdicionar.innerHTML = `<p class="text-muted small mb-0">Limite de 4 líderes atingido.</p>`;
    return;
  }

  const idsJaLideres = new Set(lista.map((l) => l.people.id));
  const disponiveis = TODAS_PESSOAS_PARA_LIDER.filter((p) => !idsJaLideres.has(p.id));

  blocoAdicionar.innerHTML = `
    <select class="form-select form-select-sm" id="selectNovoLider">
      <option value="">+ Adicionar líder...</option>
      ${disponiveis.map((p) => `<option value="${p.id}">${escapeHtml(p.full_name)}</option>`).join("")}
    </select>
  `;

  document.getElementById("selectNovoLider").addEventListener("change", async (e) => {
    const personId = e.target.value;
    if (!personId) return;
    await adicionarLider(personId);
  });
}

async function adicionarLider(personId) {
  const { error } = await sb
    .from("connection_leaders")
    .insert({ connection_id: idConexao, person_id: personId });

  if (error) {
    mostrarToast("Não foi possível adicionar: " + error.message, "danger");
    return;
  }

  mostrarToast("Líder adicionado.");
  await carregarLideres();
}

async function removerLider(id, nome) {
  const ok = await confirmarAcao(
    "Remover líder",
    `Remover "${nome}" da lista de líderes desta conexão?`,
    "Remover",
    "danger"
  );
  if (!ok) return;

  const { error } = await sb.from("connection_leaders").delete().eq("id", id);
  if (error) {
    mostrarToast("Não foi possível remover: " + error.message, "danger");
    return;
  }

  mostrarToast("Líder removido.");
  await carregarLideres();
}

// ============================================
// PÁGINA: conexao-detalhe.html?id=... (somente admin)
// ============================================

const idConexao = new URLSearchParams(window.location.search).get("id");

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

  const { data: lideres } = await sb
    .from("connection_leaders")
    .select("person_id, people(id, full_name, photo_url)")
    .eq("connection_id", idConexao)
    .order("created_at");

  const lista = pessoas || [];
  const listaLideres = lideres || [];

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
      <h2 class="h6 fw-bold mb-2">Líderes desta conexão</h2>
      ${listaLideres.length === 0
        ? `<p class="text-muted small mb-0">Nenhum líder definido ainda.</p>`
        : listaLideres.map((l) => `
          <a href="detalhe.html?id=${l.people.id}" class="d-flex align-items-center gap-2 text-decoration-none mb-2" style="color: inherit;">
            ${avatarHtml(l.people)}
            <span class="fw-semibold small">${escapeHtml(l.people.full_name)}</span>
          </a>
        `).join("")}
      <p class="text-muted small mb-0 mt-1">
        Para adicionar ou remover um líder, edite o cadastro da pessoa em Aniversariantes.
      </p>
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
                  ${badgeLiderancaHtml(p)}
                </div>
                <div class="small text-muted">🎂 ${p.birth_day} de ${nomeDoMes(p.birth_month)}</div>
              </div>
            </div>
            <div class="flex-shrink-0 ms-2">${proximoTexto(p)}</div>
          </div>
        </a>
      `).join("")}
  `;
})();

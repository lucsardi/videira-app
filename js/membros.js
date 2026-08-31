// ============================================
// PÁGINA: membros.html
// ============================================

let TODAS_PESSOAS = [];
let PODE_EDITAR = false;
let PODE_EXCLUIR = false;
let VE_TUDO = false;
let PERIODO_ATUAL = "";
let ORDENAR_POR = "nome";
let DIRECAO_ORDEM = "asc";

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("membros.html");
  PODE_EDITAR = menu?.podeEditar || false;
  PODE_EXCLUIR = menu?.podeExcluir || false;
  VE_TUDO = menu?.veTudo || false;

  if (PODE_EDITAR) document.getElementById("btnNovo").classList.remove("d-none");

  // Filtro de conexão só faz sentido pra quem vê a igreja inteira
  // (os demais já são restritos à própria conexão pelo banco)
  if (VE_TUDO) {
    const { data: conexoes } = await sb.from("connections").select("*").order("name");
    const selectConexao = document.getElementById("filtroConexao");
    (conexoes || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      selectConexao.appendChild(opt);
    });
  } else {
    document.getElementById("colConexao").classList.add("d-none");
    document.getElementById("filtroMes").parentElement.className = "col-12";
  }

  const selectMes = document.getElementById("filtroMes");
  MESES.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = m;
    selectMes.appendChild(opt);
  });

  // RLS já retorna só o que esse usuário pode ver
  const { data: pessoas, error } = await sb
    .from("people")
    .select("*, connections(name)")
    .order("full_name");

  if (error) {
    document.getElementById("listaMembros").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar: ${escapeHtml(error.message)}</div>`;
    return;
  }

  TODAS_PESSOAS = pessoas || [];
  renderizarLista();

  document.getElementById("filtroBusca").addEventListener("input", renderizarLista);
  document.getElementById("filtroConexao").addEventListener("change", renderizarLista);
  document.getElementById("filtroMes").addEventListener("change", renderizarLista);

  // Botões de período rápido (Todos/Hoje/Amanhã/Semana/Mês)
  document.getElementById("filtroPeriodo").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-periodo]");
    if (!btn) return;
    document.querySelectorAll("#filtroPeriodo button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    PERIODO_ATUAL = btn.dataset.periodo;
    renderizarLista();
  });

  // Ordenação: por nome ou por data de aniversário, crescente/decrescente
  document.getElementById("ordenarPor").addEventListener("change", (e) => {
    ORDENAR_POR = e.target.value;
    renderizarLista();
  });

  document.getElementById("btnDirecaoOrdem").addEventListener("click", () => {
    const btn = document.getElementById("btnDirecaoOrdem");
    DIRECAO_ORDEM = DIRECAO_ORDEM === "asc" ? "desc" : "asc";
    btn.dataset.direcao = DIRECAO_ORDEM;
    btn.textContent = DIRECAO_ORDEM === "asc" ? "⬆️ Crescente" : "⬇️ Decrescente";
    renderizarLista();
  });

  // Delegação de eventos para os botões "Excluir" (que mudam a cada renderização)
  document.getElementById("listaMembros").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-excluir-id]");
    if (btn) excluirPessoa(btn.dataset.excluirId, btn.dataset.excluirNome);
  });
})();

function renderizarLista() {
  const busca = document.getElementById("filtroBusca").value.trim().toLowerCase();
  const conexaoId = document.getElementById("filtroConexao").value;
  const mes = document.getElementById("filtroMes").value;

  const filtrada = TODAS_PESSOAS.filter((p) => {
    if (busca && !p.full_name.toLowerCase().includes(busca)) return false;
    if (conexaoId && p.connection_id !== conexaoId) return false;
    if (mes && String(p.birth_month) !== mes) return false;

    if (PERIODO_ATUAL) {
      const dias = ehHoje(p.birth_day, p.birth_month) ? 0 : diasAte(p.birth_day, p.birth_month);
      const mesAtual = new Date().getMonth() + 1;
      if (PERIODO_ATUAL === "hoje" && dias !== 0) return false;
      if (PERIODO_ATUAL === "amanha" && dias !== 1) return false;
      if (PERIODO_ATUAL === "semana" && dias > 7) return false;
      if (PERIODO_ATUAL === "mes" && p.birth_month !== mesAtual) return false;
    }

    return true;
  });

  // Ordenação
  filtrada.sort((a, b) => {
    let comparacao;
    if (ORDENAR_POR === "aniversario") {
      comparacao = (a.birth_month * 100 + a.birth_day) - (b.birth_month * 100 + b.birth_day);
    } else {
      comparacao = a.full_name.localeCompare(b.full_name, "pt-BR");
    }
    return DIRECAO_ORDEM === "asc" ? comparacao : -comparacao;
  });

  document.getElementById("contagem").textContent =
    `${filtrada.length} resultado${filtrada.length !== 1 ? "s" : ""}`;

  const container = document.getElementById("listaMembros");

  if (filtrada.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-4">Nenhum cadastro encontrado.</div>`;
    return;
  }

  container.innerHTML = filtrada.map((p) => {
    const dias = ehHoje(p.birth_day, p.birth_month) ? 0 : diasAte(p.birth_day, p.birth_month);
    const badge = dias === 0
      ? '<span class="badge badge-hoje">Hoje</span>'
      : dias === 1
        ? '<span class="badge badge-amanha">Amanhã</span>'
        : dias <= 7
          ? `<span class="badge badge-em-dias">Em ${dias} dias</span>`
          : "";

    return `
    <div class="card card-pessoa p-3 mb-2">
      <div class="d-flex justify-content-between align-items-start">
        <a href="detalhe.html?id=${p.id}" class="d-flex gap-2 text-decoration-none" style="color: inherit;">
          ${avatarHtml(p)}
          <div>
            <div class="fw-semibold">
              ${escapeHtml(p.full_name)}
              ${p.is_leader ? '<span class="badge badge-lider ms-1">Líder/Pastor</span>' : ""}
              ${badge ? " " + badge : ""}
            </div>
            <div class="small text-muted mt-1">🎂 ${p.birth_day} de ${nomeDoMes(p.birth_month)}</div>
            ${p.wedding_day && p.wedding_month
              ? `<div class="small text-muted">💍 Casamento: ${p.wedding_day} de ${nomeDoMes(p.wedding_month)}${p.spouse_name ? " (" + escapeHtml(p.spouse_name) + ")" : ""}</div>`
              : ""}
            <div class="small text-muted">${escapeHtml(p.connections?.name || "Sem conexão")}</div>
          </div>
        </a>
        ${PODE_EDITAR || PODE_EXCLUIR ? `
          <div class="d-flex flex-column align-items-end gap-1">
            ${PODE_EDITAR ? `<a href="novo.html?id=${p.id}" class="small">Editar</a>` : ""}
            ${PODE_EXCLUIR ? `<button class="btn btn-link btn-sm text-danger p-0 small" data-excluir-id="${p.id}" data-excluir-nome="${escapeHtml(p.full_name)}">Excluir</button>` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
  }).join("");
}

async function excluirPessoa(id, nome) {
  const ok = await confirmarAcao(
    "Excluir aniversariante",
    `Tem certeza que deseja excluir "${nome}"? Essa ação não pode ser desfeita.`,
    "Excluir",
    "danger"
  );
  if (!ok) return;

  const { error } = await sb.from("people").delete().eq("id", id);
  if (error) {
    mostrarToast("Não foi possível excluir: " + error.message, "danger");
    return;
  }

  TODAS_PESSOAS = TODAS_PESSOAS.filter((p) => p.id !== id);
  renderizarLista();
  mostrarToast("Cadastro excluído.");
}

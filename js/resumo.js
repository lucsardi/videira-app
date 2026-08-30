// ============================================
// ABA: Resumo por Conexão (dentro de relatorios.html)
// ============================================

let RESUMO_PESSOAS = [];
let RESUMO_MENU = null;
let GRAFICO_MENSAL = null;

async function iniciarResumo(menu, conexoesTodas) {
  RESUMO_MENU = menu;

  // RLS já devolve só o que esse usuário pode ver (tudo, se for admin; só a própria conexão, se for líder)
  const { data: pessoas, error } = await sb
    .from("people")
    .select("*, connections(name)");

  if (error) {
    document.getElementById("cardsResumoConexao").innerHTML =
      `<div class="col-12"><div class="alert alert-danger">Erro ao carregar: ${escapeHtml(error.message)}</div></div>`;
    return;
  }

  RESUMO_PESSOAS = pessoas || [];

  if (menu?.veTudo) {
    renderizarCardsAdmin(conexoesTodas);

    const selectFiltro = document.getElementById("filtroConexaoGrafico");
    selectFiltro.classList.remove("d-none");
    conexoesTodas.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      selectFiltro.appendChild(opt);
    });
    selectFiltro.addEventListener("change", () => desenharGrafico(selectFiltro.value));
  } else {
    renderizarCardUnico();
  }

  desenharGrafico("");
}

function mesAtualNumero() {
  return new Date().getMonth() + 1;
}

function renderizarCardsAdmin(conexoesTodas) {
  const mesAtual = mesAtualNumero();
  const container = document.getElementById("cardsResumoConexao");

  if (conexoesTodas.length === 0) {
    container.innerHTML = `<div class="col-12"><div class="card p-3 text-muted small">Nenhuma conexão cadastrada ainda.</div></div>`;
    return;
  }

  container.innerHTML = conexoesTodas.map((c) => {
    const doGrupo = RESUMO_PESSOAS.filter((p) => p.connection_id === c.id);
    const esteMes = doGrupo.filter((p) => p.birth_month === mesAtual).length;

    return `
      <div class="col-12 col-md-6">
        <div class="vd-indicador h-100">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold">${escapeHtml(c.name)}</div>
              <div class="rotulo">${doGrupo.length} pessoa${doGrupo.length !== 1 ? "s" : ""} cadastrada${doGrupo.length !== 1 ? "s" : ""}</div>
            </div>
            ${esteMes > 0 ? `<span class="badge badge-hoje">${esteMes} este mês</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderizarCardUnico() {
  const mesAtual = mesAtualNumero();
  const esteMes = RESUMO_PESSOAS.filter((p) => p.birth_month === mesAtual).length;
  const nomeConexao = RESUMO_PESSOAS[0]?.connections?.name || "Sua conexão";

  document.getElementById("cardsResumoConexao").innerHTML = `
    <div class="col-12 col-md-6">
      <div class="vd-indicador">
        <div class="fw-bold">${escapeHtml(nomeConexao)}</div>
        <div class="valor">${RESUMO_PESSOAS.length}</div>
        <div class="rotulo">pessoa${RESUMO_PESSOAS.length !== 1 ? "s" : ""} cadastrada${RESUMO_PESSOAS.length !== 1 ? "s" : ""}</div>
      </div>
    </div>
    <div class="col-12 col-md-6">
      <div class="vd-indicador destaque">
        <div class="valor">${esteMes}</div>
        <div class="rotulo">aniversariantes este mês</div>
      </div>
    </div>
  `;
}

function desenharGrafico(conexaoIdFiltro) {
  const pessoasFiltradas = conexaoIdFiltro
    ? RESUMO_PESSOAS.filter((p) => p.connection_id === conexaoIdFiltro)
    : RESUMO_PESSOAS;

  const contagemPorMes = new Array(12).fill(0);
  pessoasFiltradas.forEach((p) => {
    contagemPorMes[p.birth_month - 1]++;
  });

  const ctx = document.getElementById("graficoMensal");

  if (GRAFICO_MENSAL) {
    GRAFICO_MENSAL.data.datasets[0].data = contagemPorMes;
    GRAFICO_MENSAL.update();
    return;
  }

  GRAFICO_MENSAL = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MESES.map((m) => m.slice(0, 3)),
      datasets: [{
        label: "Aniversariantes",
        data: contagemPorMes,
        backgroundColor: "#439965",
        borderRadius: 6,
        maxBarThickness: 36,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

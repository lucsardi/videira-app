// ============================================
// PÁGINA: index.html (Dashboard)
// ============================================

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("index.html");
  if (menu?.podeEditar) {
    document.getElementById("botoesRodape").insertAdjacentHTML(
      "beforeend",
      `<a href="novo.html" class="btn btn-primary flex-fill">+ Novo cadastro</a>`
    );
  }

  const nomeExibicao = menu?.perfil?.full_name || sessao.user.email;
  document.getElementById("saudacao").textContent = `Olá, ${nomeExibicao.split(" ")[0]}! 👋`;
  document.getElementById("dataHoje").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  // RLS já filtra pela conexão do usuário (se não for admin)
  const { data: pessoas, error } = await sb
    .from("people")
    .select("*, connections(name)")
    .order("full_name");

  if (error) {
    document.getElementById("listaHoje").innerHTML =
      `<div class="alert alert-danger">Erro ao carregar dados: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const lista = aplicarCasamentosVinculados(pessoas || []);
  const mesAtual = new Date().getMonth() + 1;

  const hoje = lista.filter((p) => ehHoje(p.birth_day, p.birth_month));
  const casamentosHoje = lista.filter(
    (p) => p.wedding_day && p.wedding_month && ehHoje(p.wedding_day, p.wedding_month)
  );
  const proximos7 = lista.filter((p) => {
    const d = diasAte(p.birth_day, p.birth_month);
    return d > 0 && d <= 7;
  });
  const esteMes = lista.filter((p) => p.birth_month === mesAtual);
  const conexoesAtivas = new Set(lista.map((p) => p.connection_id).filter(Boolean)).size;

  // ---------- Cards de indicadores ----------
  document.getElementById("cardsIndicadores").innerHTML = `
    <div class="col-6 col-md-3">
      <div class="vd-indicador destaque">
        <div class="valor">${String(hoje.length).padStart(2, "0")}</div>
        <div class="rotulo">Aniversariantes hoje</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="vd-indicador">
        <div class="valor">${String(proximos7.length).padStart(2, "0")}</div>
        <div class="rotulo">Próximos 7 dias</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="vd-indicador">
        <div class="valor">${String(esteMes.length).padStart(2, "0")}</div>
        <div class="rotulo">Aniversariantes este mês</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="vd-indicador">
        <div class="valor">${String(conexoesAtivas).padStart(2, "0")}</div>
        <div class="rotulo">Conexões ativas</div>
      </div>
    </div>
  `;

  // ---------- Aniversariantes de hoje ----------
  const containerHoje = document.getElementById("listaHoje");
  if (hoje.length === 0 && casamentosHoje.length === 0) {
    containerHoje.innerHTML = `<div class="card p-3 text-muted small">Ninguém faz aniversário hoje. Que tal ver os próximos? 👇</div>`;
  } else {
    containerHoje.innerHTML =
      hoje.map((p) => cardPessoa(p, "🎂", p.connections?.name)).join("") +
      casamentosHoje.map((p) => cardPessoa(
        { ...p, full_name: p.full_name + (p.spouse_name ? ` & ${p.spouse_name}` : "") },
        "💍", "Aniversário de casamento"
      )).join("");
  }

  // ---------- Próximos aniversários ----------
  const proximos = lista
    .filter((p) => !ehHoje(p.birth_day, p.birth_month))
    .map((p) => ({ pessoa: p, dias: diasAte(p.birth_day, p.birth_month) }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  const containerProximos = document.getElementById("listaProximos");
  if (proximos.length === 0) {
    containerProximos.innerHTML = `<div class="text-muted small">Nenhum cadastro ainda.</div>`;
  } else {
    containerProximos.innerHTML = proximos.map(({ pessoa, dias }) => `
      <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          ${avatarHtml(pessoa)}
          <div>
            <div class="fw-semibold">${escapeHtml(pessoa.full_name)}</div>
            <div class="small text-muted">
              ${pessoa.birth_day} de ${nomeDoMes(pessoa.birth_month)} · ${escapeHtml(pessoa.connections?.name || "Sem conexão")}
            </div>
          </div>
        </div>
        <span class="badge ${dias === 1 ? "badge-amanha" : "badge-em-dias"}">
          ${dias === 1 ? "Amanhã" : `em ${dias} dias`}
        </span>
      </div>
    `).join("");
  }

  // ---------- Próximos aniversários de casamento ----------
  const proximosCasamentos = lista
    .filter((p) => p.wedding_day && p.wedding_month && !ehHoje(p.wedding_day, p.wedding_month))
    .map((p) => ({ pessoa: p, dias: diasAte(p.wedding_day, p.wedding_month) }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5);

  const containerProximosCasamentos = document.getElementById("listaProximosCasamentos");
  if (proximosCasamentos.length === 0) {
    containerProximosCasamentos.innerHTML = `<div class="text-muted small">Nenhum aniversário de casamento cadastrado.</div>`;
  } else {
    containerProximosCasamentos.innerHTML = proximosCasamentos.map(({ pessoa, dias }) => `
      <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          ${avatarHtml(pessoa)}
          <div>
            <div class="fw-semibold">${escapeHtml(pessoa.full_name)}${pessoa.spouse_name ? " & " + escapeHtml(pessoa.spouse_name) : ""}</div>
            <div class="small text-muted">
              💍 ${pessoa.wedding_day} de ${nomeDoMes(pessoa.wedding_month)} · ${escapeHtml(pessoa.connections?.name || "Sem conexão")}
            </div>
          </div>
        </div>
        <span class="badge ${dias === 1 ? "badge-amanha" : "badge-em-dias"}">
          ${dias === 1 ? "Amanhã" : `em ${dias} dias`}
        </span>
      </div>
    `).join("");
  }

  // ---------- Conexões em destaque (para quem vê a igreja inteira: admin ou Visualização Total) ----------
  if (menu?.veTudo) {
    renderizarConexoesDestaque(lista);
  }
})();

function renderizarConexoesDestaque(lista) {
  const porConexao = new Map();

  lista.forEach((p) => {
    if (!p.connection_id) return;
    const dias = ehHoje(p.birth_day, p.birth_month) ? 0 : diasAte(p.birth_day, p.birth_month);
    const atual = porConexao.get(p.connection_id);
    if (!atual || dias < atual.dias) {
      porConexao.set(p.connection_id, {
        nome: p.connections?.name || "Conexão",
        pessoa: p.full_name,
        dias,
      });
    }
    porConexao.get(p.connection_id).total = (porConexao.get(p.connection_id).total || 0) + 1;
  });

  const destaques = [...porConexao.values()].sort((a, b) => a.dias - b.dias).slice(0, 5);

  if (destaques.length === 0) return;

  document.getElementById("secaoConexoesDestaque").classList.remove("d-none");
  document.getElementById("listaConexoesDestaque").innerHTML = destaques.map((d) => `
    <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
      <div>
        <div class="fw-semibold">${escapeHtml(d.nome)}</div>
        <div class="small text-muted">${d.total} pessoa${d.total !== 1 ? "s" : ""} · próximo: ${escapeHtml(d.pessoa)}</div>
      </div>
      <span class="badge ${d.dias === 0 ? "badge-hoje" : d.dias === 1 ? "badge-amanha" : "badge-em-dias"}">
        ${d.dias === 0 ? "Hoje" : d.dias === 1 ? "Amanhã" : `em ${d.dias} dias`}
      </span>
    </div>
  `).join("");
}

function cardPessoa(p, icone, subtitulo) {
  return `
    <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-2">
        ${avatarHtml(p)}
        <div>
          <div class="fw-semibold">${escapeHtml(p.full_name)}</div>
          <div class="small text-muted">${escapeHtml(subtitulo || "")}${p.is_leader ? " · Líder/Pastor" : ""}</div>
        </div>
      </div>
      <span style="font-size: 1.4rem;">${icone}</span>
    </div>
  `;
}

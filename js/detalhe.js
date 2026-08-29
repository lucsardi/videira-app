// ============================================
// PÁGINA: detalhe.html?id=...
// ============================================

const idDetalhe = new URLSearchParams(window.location.search).get("id");

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("detalhe.html");

  if (!idDetalhe) {
    window.location.href = "membros.html";
    return;
  }

  // RLS já impede carregar gente fora do escopo do usuário
  const { data: p, error } = await sb
    .from("people")
    .select("*, connections(name)")
    .eq("id", idDetalhe)
    .single();

  const container = document.getElementById("conteudoDetalhe");

  if (error || !p) {
    container.innerHTML = `<div class="alert alert-warning">Não foi possível encontrar esse cadastro (ou você não tem acesso a ele).</div>`;
    return;
  }

  const dias = ehHoje(p.birth_day, p.birth_month) ? 0 : diasAte(p.birth_day, p.birth_month);
  const rotuloDias = dias === 0 ? "🎉 Hoje é o dia!" : dias === 1 ? "Aniversário amanhã" : `Faltam ${dias} dias`;

  container.innerHTML = `
    <div class="text-center mb-4">
      ${avatarHtml(p, "vd-avatar-lg")}
      <h1 class="h5 fw-bold mt-3 mb-0">${escapeHtml(p.full_name)}</h1>
      ${p.is_leader ? '<span class="badge badge-lider mt-1">Líder/Pastor</span>' : ""}
    </div>

    <div class="card p-3 mb-2">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="small text-muted">Aniversário</div>
          <div class="fw-semibold">🎂 ${p.birth_day} de ${nomeDoMes(p.birth_month)}</div>
        </div>
        <span class="badge ${dias === 0 ? "badge-hoje" : dias === 1 ? "badge-amanha" : "badge-em-dias"}">${rotuloDias}</span>
      </div>
    </div>

    ${p.wedding_day && p.wedding_month ? `
      <div class="card p-3 mb-2">
        <div class="small text-muted">Aniversário de casamento</div>
        <div class="fw-semibold">💍 ${p.wedding_day} de ${nomeDoMes(p.wedding_month)}${p.spouse_name ? " — " + escapeHtml(p.spouse_name) : ""}</div>
      </div>
    ` : ""}

    <div class="card p-3 mb-3">
      <div class="small text-muted">Conexão</div>
      <div class="fw-semibold">🌿 ${escapeHtml(p.connections?.name || "Sem conexão")}</div>
    </div>

    <div class="d-flex gap-2">
      <button class="btn btn-celebration flex-fill" id="btnCelebrar">🎉 Celebrar</button>
      ${menu?.podeEditar ? `<a href="novo.html?id=${p.id}" class="btn btn-outline-primary flex-fill">Editar</a>` : ""}
    </div>
    ${menu?.podeExcluir ? `<button class="btn btn-link text-danger w-100 mt-2" id="btnExcluir">Excluir cadastro</button>` : ""}
  `;

  document.getElementById("btnCelebrar")?.addEventListener("click", () => {
    mostrarToast(`🎉 Celebração registrada para ${p.full_name.split(" ")[0]}!`);
  });

  document.getElementById("btnExcluir")?.addEventListener("click", async () => {
    const ok = await confirmarAcao(
      "Excluir aniversariante",
      `Tem certeza que deseja excluir "${p.full_name}"? Essa ação não pode ser desfeita.`,
      "Excluir",
      "danger"
    );
    if (!ok) return;

    const { error: erroExcluir } = await sb.from("people").delete().eq("id", p.id);
    if (erroExcluir) {
      mostrarToast("Não foi possível excluir: " + erroExcluir.message, "danger");
      return;
    }
    window.location.href = "membros.html";
  });
})();

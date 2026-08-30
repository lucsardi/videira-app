// ============================================
// PÁGINA: relatorios.html
// ============================================

let RESULTADO_ATUAL = [];
let CONEXOES_TODAS = [];

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("relatorios.html");

  if (menu?.veTudo) {
    const { data: conexoes } = await sb.from("connections").select("*").order("name");
    CONEXOES_TODAS = conexoes || [];
    const selectConexao = document.getElementById("filtroConexao");
    CONEXOES_TODAS.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      selectConexao.appendChild(opt);
    });
  } else {
    document.getElementById("colFiltroConexao").classList.add("d-none");
  }

  const selectMes = document.getElementById("filtroMes");
  MESES.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = m;
    selectMes.appendChild(opt);
  });

  document.getElementById("btnPreview").addEventListener("click", gerarPreview);
  document.getElementById("btnBaixarPdf").addEventListener("click", baixarPdf);

  // Aba "Resumo por Conexão" (js/resumo.js)
  iniciarResumo(menu, CONEXOES_TODAS);
})();

function tipoSelecionado() {
  return document.querySelector('input[name="tipoRelatorio"]:checked').value;
}

async function gerarPreview() {
  const tipo = tipoSelecionado();
  const conexaoId = document.getElementById("filtroConexao").value;
  const mes = document.getElementById("filtroMes").value;

  let query = sb.from("people").select("*, connections(name)");

  if (conexaoId) query = query.eq("connection_id", conexaoId);

  if (tipo === "aniversario") {
    query = query.order("birth_month").order("birth_day");
    if (mes) query = query.eq("birth_month", Number(mes));
  } else {
    query = query.not("wedding_day", "is", null).order("wedding_month").order("wedding_day");
    if (mes) query = query.eq("wedding_month", Number(mes));
  }

  const { data, error } = await query;
  const container = document.getElementById("listaPreview");
  const btnBaixar = document.getElementById("btnBaixarPdf");

  if (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(error.message)}</div>`;
    btnBaixar.classList.add("d-none");
    return;
  }

  RESULTADO_ATUAL = data || [];

  if (RESULTADO_ATUAL.length === 0) {
    container.innerHTML = `<div class="text-muted small">Nenhum resultado para esse filtro.</div>`;
    btnBaixar.classList.add("d-none");
    return;
  }

  container.innerHTML = RESULTADO_ATUAL.map((p) => `
    <div class="card card-pessoa p-2 mb-2 d-flex flex-row justify-content-between small">
      <span>${escapeHtml(p.full_name)}${tipo === "casamento" && p.spouse_name ? " & " + escapeHtml(p.spouse_name) : ""}</span>
      <span class="text-muted">
        ${tipo === "aniversario"
          ? `${p.birth_day} de ${nomeDoMes(p.birth_month)}`
          : `${p.wedding_day} de ${nomeDoMes(p.wedding_month)}`}
      </span>
    </div>
  `).join("");

  btnBaixar.textContent = `📄 Baixar PDF (${RESULTADO_ATUAL.length} registro${RESULTADO_ATUAL.length !== 1 ? "s" : ""})`;
  btnBaixar.classList.remove("d-none");
}

function baixarPdf() {
  const tipo = tipoSelecionado();
  const conexaoId = document.getElementById("filtroConexao").value;
  const mes = document.getElementById("filtroMes").value;

  const nomeConexao = conexaoId
    ? document.getElementById("filtroConexao").selectedOptions[0].textContent
    : "Todas as conexões";
  const tituloTipo = tipo === "aniversario" ? "Relatório de Aniversariantes" : "Relatório de Aniversários de Casamento";
  const tituloMes = mes ? ` — ${nomeDoMes(Number(mes))}` : "";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`${tituloTipo}${tituloMes}`, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Conexão: ${nomeConexao}`, 14, 23);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

  const linhas = tipo === "aniversario"
    ? RESULTADO_ATUAL.map((p) => [p.full_name, `${p.birth_day} de ${nomeDoMes(p.birth_month)}`, p.connections?.name || "-"])
    : RESULTADO_ATUAL.map((p) => [
        p.full_name + (p.spouse_name ? ` & ${p.spouse_name}` : ""),
        `${p.wedding_day} de ${nomeDoMes(p.wedding_month)}`,
        p.connections?.name || "-",
      ]);

  doc.autoTable({
    startY: 34,
    head: [["Nome", "Data", "Conexão"]],
    body: linhas,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`relatorio-${tipo}${mes ? "-" + nomeDoMes(Number(mes)) : ""}.pdf`);
}

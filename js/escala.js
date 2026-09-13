// ============================================
// PÁGINA: escala.html
// ============================================

let PODE_GERENCIAR_ESCALA = false;
let TODAS_PESSOAS_ESCALA = [];

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("escala.html");
  PODE_GERENCIAR_ESCALA = menu?.ehAdmin || false;

  if (PODE_GERENCIAR_ESCALA) {
    document.getElementById("blocoNovaEscala").classList.remove("d-none");

    const { data: pessoas } = await sb.from("people").select("id, full_name").order("full_name");
    TODAS_PESSOAS_ESCALA = pessoas || [];
    const selectPessoa = document.getElementById("escalaPessoa");
    TODAS_PESSOAS_ESCALA.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.full_name;
      selectPessoa.appendChild(opt);
    });

    document.getElementById("formEscala").addEventListener("submit", adicionarEscala);
  }

  await carregarEscala();
})();

function formatarData(dataIso) {
  // dataIso vem como "2026-09-14" — monta a data em horário local pra não
  // cair no dia anterior por causa de fuso horário
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

async function carregarEscala() {
  const hojeIso = new Date().toISOString().slice(0, 10);

  const { data: proximas, error: erro1 } = await sb
    .from("escala")
    .select("*, people(id, full_name, photo_url)")
    .gte("data", hojeIso)
    .order("data", { ascending: true });

  const { data: passadas, error: erro2 } = await sb
    .from("escala")
    .select("*, people(id, full_name, photo_url)")
    .lt("data", hojeIso)
    .order("data", { ascending: false });

  renderizarLista("listaEscalaProximas", proximas, erro1, "Nenhuma escala futura cadastrada.");
  renderizarLista("listaEscalaPassadas", passadas, erro2, "Nenhuma escala anterior registrada.");
}

function renderizarLista(idContainer, itens, erro, mensagemVazia) {
  const container = document.getElementById(idContainer);

  if (erro) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar: ${escapeHtml(erro.message)}</div>`;
    return;
  }

  if (!itens || itens.length === 0) {
    container.innerHTML = `<div class="text-muted small">${mensagemVazia}</div>`;
    return;
  }

  container.innerHTML = itens.map((item) => `
    <div class="card card-pessoa p-3 mb-2">
      <div class="d-flex justify-content-between align-items-start">
        <a href="detalhe.html?id=${item.people.id}" class="d-flex align-items-center gap-2 text-decoration-none" style="color: inherit; min-width: 0;">
          ${avatarHtml(item.people)}
          <div style="min-width: 0;">
            <div class="fw-semibold small text-capitalize">${escapeHtml(formatarData(item.data))}</div>
            <div class="small">${escapeHtml(item.people.full_name)}</div>
            ${item.observacoes ? `<div class="small text-muted">${escapeHtml(item.observacoes)}</div>` : ""}
          </div>
        </a>
        ${PODE_GERENCIAR_ESCALA
          ? `<button class="btn btn-link btn-sm text-danger p-0 small flex-shrink-0" data-remover-escala="${item.id}">Remover</button>`
          : ""}
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-remover-escala]").forEach((btn) => {
    btn.addEventListener("click", () => removerEscala(btn.dataset.removerEscala));
  });
}

async function adicionarEscala(e) {
  e.preventDefault();
  const msgErro = document.getElementById("msgErroEscala");
  const btn = document.getElementById("btnAdicionarEscala");
  msgErro.classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Adicionando...";

  const payload = {
    data: document.getElementById("escalaData").value,
    pessoa_id: document.getElementById("escalaPessoa").value,
    observacoes: document.getElementById("escalaObs").value.trim() || null,
  };

  const { error } = await sb.from("escala").insert(payload);

  btn.disabled = false;
  btn.textContent = "Adicionar";

  if (error) {
    msgErro.textContent = "Não foi possível adicionar: " + error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  document.getElementById("formEscala").reset();
  await carregarEscala();
  mostrarToast("Escala adicionada.");
}

async function removerEscala(id) {
  const ok = await confirmarAcao(
    "Remover da escala",
    "Tem certeza que deseja remover esse registro da escala?",
    "Remover",
    "danger"
  );
  if (!ok) return;

  const { error } = await sb.from("escala").delete().eq("id", id);
  if (error) {
    mostrarToast("Não foi possível remover: " + error.message, "danger");
    return;
  }

  await carregarEscala();
  mostrarToast("Removido da escala.");
}

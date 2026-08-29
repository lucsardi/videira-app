// ============================================
// PÁGINA: usuarios.html (somente admin)
// Define o papel (role) e a conexão de cada usuário, e gera convites
// para novos logins (sem precisar ir no Supabase).
// ============================================

let CONEXOES_CACHE = [];
let CURRENT_USER_ID = null;

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;
  CURRENT_USER_ID = sessao.user.id;

  const menu = await montarLayout("usuarios.html");
  if (!menu?.ehAdmin) {
    window.location.href = "index.html";
    return;
  }

  const { data: conexoes } = await sb.from("connections").select("*").order("name");
  CONEXOES_CACHE = conexoes || [];

  const selectConexaoConvite = document.getElementById("conviteConexao");
  CONEXOES_CACHE.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    selectConexaoConvite.appendChild(opt);
  });

  document.getElementById("formConvite").addEventListener("submit", gerarConvite);
  document.getElementById("btnCopiarLink").addEventListener("click", copiarLink);

  await carregarConvitesPendentes();
  await carregarUsuarios();
})();

// ---------- Gerar convite ----------
async function gerarConvite(e) {
  e.preventDefault();
  const msgErro = document.getElementById("msgErro");
  const btn = document.getElementById("btnGerarConvite");
  msgErro.classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Gerando...";

  const email = document.getElementById("conviteEmail").value.trim();
  const role = document.getElementById("convitePapel").value;
  const connection_id = document.getElementById("conviteConexao").value || null;

  const { data, error } = await sb
    .from("invites")
    .insert({ email, role, connection_id, created_by: CURRENT_USER_ID })
    .select()
    .single();

  btn.disabled = false;
  btn.textContent = "Gerar link de convite";

  if (error) {
    msgErro.textContent = "Não foi possível gerar o convite: " + error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  const link = `${window.location.origin}${window.location.pathname.replace("usuarios.html", "convite.html")}?token=${data.token}`;
  document.getElementById("linkConviteTexto").value = link;
  document.getElementById("linkGerado").classList.remove("d-none");
  document.getElementById("formConvite").reset();

  await carregarConvitesPendentes();
  mostrarToast("Convite gerado! Copie o link e envie para a pessoa.");
}

function copiarLink() {
  const input = document.getElementById("linkConviteTexto");
  input.select();
  navigator.clipboard?.writeText(input.value);
  mostrarToast("Link copiado!");
}

// ---------- Convites pendentes ----------
async function carregarConvitesPendentes() {
  const { data: convites, error } = await sb
    .from("invites")
    .select("*, connections(name)")
    .eq("used", false)
    .order("created_at", { ascending: false });

  const container = document.getElementById("listaConvitesPendentes");

  if (error || !convites || convites.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <h2 class="h6 fw-bold mb-2">Convites pendentes</h2>
    ${convites.map((c) => `
      <div class="card card-pessoa p-3 mb-2 d-flex flex-row justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">${escapeHtml(c.email)}</div>
          <div class="small text-muted">${escapeHtml(rotuloPapel(c.role))}${c.connections?.name ? " · " + escapeHtml(c.connections.name) : ""}</div>
        </div>
        <div class="d-flex gap-3">
          <button class="btn btn-link btn-sm p-0 small" data-copiar-token="${c.token}">Copiar link</button>
          <button class="btn btn-link btn-sm p-0 small text-danger" data-cancelar-id="${c.id}">Cancelar</button>
        </div>
      </div>
    `).join("")}
  `;

  container.querySelectorAll("[data-copiar-token]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const link = `${window.location.origin}${window.location.pathname.replace("usuarios.html", "convite.html")}?token=${btn.dataset.copiarToken}`;
      navigator.clipboard?.writeText(link);
      mostrarToast("Link copiado!");
    });
  });

  container.querySelectorAll("[data-cancelar-id]").forEach((btn) => {
    btn.addEventListener("click", () => cancelarConvite(btn.dataset.cancelarId));
  });
}

async function cancelarConvite(id) {
  const ok = await confirmarAcao("Cancelar convite", "O link deixará de funcionar. Deseja continuar?", "Cancelar convite", "danger");
  if (!ok) return;

  const { error } = await sb.from("invites").delete().eq("id", id);
  if (error) {
    mostrarToast("Não foi possível cancelar: " + error.message, "danger");
    return;
  }
  await carregarConvitesPendentes();
  mostrarToast("Convite cancelado.");
}

// ---------- Lista de usuários já existentes ----------
async function carregarUsuarios() {
  const { data: perfis, error } = await sb
    .from("profiles")
    .select("*")
    .order("created_at");

  const container = document.getElementById("listaUsuarios");

  if (error) {
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!perfis || perfis.length === 0) {
    container.innerHTML = `<div class="text-muted small">Nenhum usuário encontrado.</div>`;
    return;
  }

  const opcoesConexao = (selecionada) => `
    <option value="">Sem conexão</option>
    ${CONEXOES_CACHE.map((c) => `<option value="${c.id}" ${c.id === selecionada ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
  `;

  container.innerHTML = perfis.map((p) => `
    <div class="card card-pessoa p-3 mb-2">
      <div class="row g-2 align-items-center">
        <div class="col-12 col-md-4">
          <div class="fw-semibold">${escapeHtml(p.full_name || "(sem nome)")}</div>
          <div class="small text-muted">${p.id === CURRENT_USER_ID ? "Você" : ""}</div>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small mb-1">Papel</label>
          <select class="form-select form-select-sm" data-papel-id="${p.id}">
            <option value="admin" ${p.role === "admin" ? "selected" : ""}>Administrador</option>
            <option value="leader_view" ${p.role === "leader_view" ? "selected" : ""}>Líder — Visualização</option>
            <option value="leader_editor" ${p.role === "leader_editor" ? "selected" : ""}>Líder — Editor</option>
            <option value="leader_manager" ${p.role === "leader_manager" ? "selected" : ""}>Líder — Gestor</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small mb-1">Conexão</label>
          <select class="form-select form-select-sm" data-conexao-id="${p.id}">
            ${opcoesConexao(p.connection_id)}
          </select>
        </div>
        <div class="col-12 col-md-2 text-md-end">
          ${p.id === CURRENT_USER_ID
            ? ""
            : `<button class="btn btn-link btn-sm text-danger p-0 small" data-remover-id="${p.id}" data-remover-nome="${escapeHtml(p.full_name || "essa pessoa")}">Remover acesso</button>`}
        </div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-papel-id]").forEach((select) => {
    select.addEventListener("change", () => atualizarPapel(select.dataset.papelId, select.value));
  });
  container.querySelectorAll("[data-conexao-id]").forEach((select) => {
    select.addEventListener("change", () => atualizarConexao(select.dataset.conexaoId, select.value));
  });
  container.querySelectorAll("[data-remover-id]").forEach((btn) => {
    btn.addEventListener("click", () => removerAcesso(btn.dataset.removerId, btn.dataset.removerNome));
  });
}

async function removerAcesso(id, nome) {
  const ok = await confirmarAcao(
    "Remover acesso",
    `"${nome}" vai perder o acesso ao app imediatamente (o login continua existindo no Supabase, mas sem nenhuma permissão). Deseja continuar?`,
    "Remover acesso",
    "danger"
  );
  if (!ok) return;

  const { error } = await sb.from("profiles").delete().eq("id", id);
  if (error) {
    mostrarToast("Não foi possível remover: " + error.message, "danger");
    return;
  }
  await carregarUsuarios();
  mostrarToast("Acesso removido.");
}

async function atualizarPapel(id, novoPapel) {
  const { error } = await sb.from("profiles").update({ role: novoPapel }).eq("id", id);
  mostrarResultado(error);
}

async function atualizarConexao(id, novaConexao) {
  const { error } = await sb.from("profiles").update({ connection_id: novaConexao || null }).eq("id", id);
  mostrarResultado(error);
}

function mostrarResultado(error) {
  const msgErro = document.getElementById("msgErro");
  if (error) {
    msgErro.textContent = "Não foi possível salvar: " + error.message;
    msgErro.classList.remove("d-none");
  } else {
    msgErro.classList.add("d-none");
    mostrarToast("Atualizado.");
  }
}

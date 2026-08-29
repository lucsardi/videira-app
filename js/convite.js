// ============================================
// PÁGINA: convite.html?token=...
// Tela pública (sem login) onde a pessoa convidada cria a própria senha
// ============================================

const tokenConvite = new URLSearchParams(window.location.search).get("token");

(async () => {
  const container = document.getElementById("conteudoConvite");

  if (!tokenConvite) {
    container.innerHTML = `<div class="alert alert-warning">Link de convite inválido. Peça para o administrador te enviar o link novamente.</div>`;
    return;
  }

  const { data, error } = await sb.rpc("get_invite_info", { p_token: tokenConvite });
  const convite = Array.isArray(data) ? data[0] : data;

  if (error || !convite) {
    container.innerHTML = `<div class="alert alert-warning">Não encontramos esse convite. Ele pode ter expirado ou o link está incompleto.</div>`;
    return;
  }

  if (convite.used) {
    container.innerHTML = `
      <div class="alert alert-info">Esse convite já foi usado.</div>
      <a href="login.html" class="btn btn-primary w-100">Ir para o login</a>
    `;
    return;
  }

  container.innerHTML = `
    <p class="text-center text-muted small mb-3">
      Você foi convidado(a) como <strong>${escapeHtml(rotuloPapel(convite.role))}</strong>
      ${convite.connection_name ? ` na conexão <strong>${escapeHtml(convite.connection_name)}</strong>` : ""}.
      Crie sua senha para acessar.
    </p>

    <div id="msgErro" class="alert alert-danger d-none"></div>

    <form id="formConvite">
      <div class="mb-3">
        <label class="form-label">Seu nome completo</label>
        <input type="text" class="form-control" id="nomeCompleto" required placeholder="Digite seu nome">
      </div>
      <div class="mb-3">
        <label class="form-label">E-mail</label>
        <input type="email" class="form-control" value="${escapeHtml(convite.email)}" disabled>
      </div>
      <div class="mb-3">
        <label class="form-label">Crie uma senha</label>
        <input type="password" class="form-control" id="senha" required minlength="6" placeholder="Mínimo 6 caracteres">
      </div>
      <button type="submit" class="btn btn-primary w-100" id="btnCriarConta">Criar minha conta</button>
    </form>
  `;

  document.getElementById("formConvite").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgErro = document.getElementById("msgErro");
    const btn = document.getElementById("btnCriarConta");
    msgErro.classList.add("d-none");
    btn.disabled = true;
    btn.textContent = "Criando conta...";

    const nome = document.getElementById("nomeCompleto").value.trim();
    const senha = document.getElementById("senha").value;

    const { error: erroCadastro } = await sb.auth.signUp({
      email: convite.email,
      password: senha,
      options: { data: { full_name: nome } },
    });

    btn.disabled = false;
    btn.textContent = "Criar minha conta";

    if (erroCadastro) {
      msgErro.textContent = erroCadastro.message;
      msgErro.classList.remove("d-none");
      return;
    }

    container.innerHTML = `
      <div class="alert alert-success">
        Conta criada! 🎉 Enviamos um e-mail de confirmação para <strong>${escapeHtml(convite.email)}</strong>.
        Abra o e-mail, confirme, e depois faça login normalmente.
      </div>
      <a href="login.html" class="btn btn-outline-primary w-100">Ir para o login</a>
    `;
  });
})();

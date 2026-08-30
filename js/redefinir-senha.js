// ============================================
// PÁGINA: redefinir-senha.html
// Chegou aqui através do link de e-mail gerado por resetPasswordForEmail.
// O supabase-js já processa o token que vem na URL sozinho.
// ============================================

const container = document.getElementById("conteudoRedefinir");
let jaMostrado = false;

function mostrarFormulario() {
  if (jaMostrado) return;
  jaMostrado = true;

  container.innerHTML = `
    <h1 class="h5 fw-bold mb-1">Crie uma nova senha</h1>
    <p class="text-muted small mb-3">Escolha uma senha nova para acessar o Videira App.</p>

    <div id="msgErro" class="alert alert-danger d-none"></div>

    <form id="formNovaSenha">
      <div class="mb-3">
        <label class="form-label">Nova senha</label>
        <input type="password" class="form-control" id="novaSenha" required minlength="6" placeholder="Mínimo 6 caracteres">
      </div>
      <div class="mb-3">
        <label class="form-label">Confirmar nova senha</label>
        <input type="password" class="form-control" id="confirmarSenha" required minlength="6">
      </div>
      <button type="submit" class="btn btn-primary w-100" id="btnConfirmar">Salvar nova senha</button>
    </form>
  `;

  document.getElementById("formNovaSenha").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgErro = document.getElementById("msgErro");
    const btn = document.getElementById("btnConfirmar");
    msgErro.classList.add("d-none");

    const novaSenha = document.getElementById("novaSenha").value;
    const confirmar = document.getElementById("confirmarSenha").value;

    if (novaSenha !== confirmar) {
      msgErro.textContent = "As senhas não coincidem.";
      msgErro.classList.remove("d-none");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Salvando...";

    const { error } = await sb.auth.updateUser({ password: novaSenha });

    if (error) {
      btn.disabled = false;
      btn.textContent = "Salvar nova senha";
      msgErro.textContent = "Não foi possível salvar: " + error.message;
      msgErro.classList.remove("d-none");
      return;
    }

    container.innerHTML = `
      <div class="alert alert-success">Senha atualizada! Redirecionando...</div>
    `;
    setTimeout(() => (window.location.href = "index.html"), 1500);
  });
}

function mostrarErro() {
  if (jaMostrado) return;
  jaMostrado = true;
  container.innerHTML = `
    <div class="alert alert-warning">
      Esse link é inválido ou já expirou. Peça um novo link na tela de
      <a href="recuperar-senha.html">recuperar senha</a>.
    </div>
  `;
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session) {
    mostrarFormulario();
  }
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    mostrarFormulario();
    return;
  }
  // Dá um tempo para o supabase-js processar o token da URL antes de desistir
  setTimeout(async () => {
    const { data: { session: sessao2 } } = await sb.auth.getSession();
    if (sessao2) mostrarFormulario();
    else mostrarErro();
  }, 2500);
})();

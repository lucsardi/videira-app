// ============================================
// PÁGINA: perfil.html
// ============================================

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("perfil.html");

  document.getElementById("perfilNome").value = menu?.perfil?.full_name || "";
  document.getElementById("perfilEmail").value = sessao.user.email || "";
  document.getElementById("perfilPapel").value = rotuloPapel(menu?.perfil?.role);

  if (menu?.perfil?.connection_id) {
    const { data: conexao } = await sb
      .from("connections")
      .select("name")
      .eq("id", menu.perfil.connection_id)
      .single();
    if (conexao) {
      document.getElementById("perfilConexao").value = conexao.name;
      document.getElementById("grupoPerfilConexao").classList.remove("d-none");
    }
  }

  document.getElementById("formPerfil").addEventListener("submit", salvarPerfil);
  document.getElementById("formSenha").addEventListener("submit", trocarSenha);
})();

async function salvarPerfil(e) {
  e.preventDefault();
  const msgErro = document.getElementById("msgErroPerfil");
  const msgSucesso = document.getElementById("msgSucessoPerfil");
  const btn = document.getElementById("btnSalvarPerfil");
  msgErro.classList.add("d-none");
  msgSucesso.classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  const {
    data: { user },
  } = await sb.auth.getUser();

  const nome = document.getElementById("perfilNome").value.trim();
  const { error } = await sb.from("profiles").update({ full_name: nome }).eq("id", user.id);

  btn.disabled = false;
  btn.textContent = "Salvar nome";

  if (error) {
    msgErro.textContent = "Não foi possível salvar: " + error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  msgSucesso.textContent = "Nome atualizado!";
  msgSucesso.classList.remove("d-none");
  mostrarToast("Perfil atualizado.");
}

async function trocarSenha(e) {
  e.preventDefault();
  const msgErro = document.getElementById("msgErroSenha");
  const msgSucesso = document.getElementById("msgSucessoSenha");
  const btn = document.getElementById("btnTrocarSenha");
  msgErro.classList.add("d-none");
  msgSucesso.classList.add("d-none");

  const novaSenha = document.getElementById("novaSenha").value;
  const confirmar = document.getElementById("confirmarSenha").value;

  if (novaSenha !== confirmar) {
    msgErro.textContent = "As senhas não coincidem.";
    msgErro.classList.remove("d-none");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Atualizando...";

  const { error } = await sb.auth.updateUser({ password: novaSenha });

  btn.disabled = false;
  btn.textContent = "Atualizar senha";

  if (error) {
    msgErro.textContent = "Não foi possível trocar a senha: " + error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  msgSucesso.textContent = "Senha atualizada com sucesso!";
  msgSucesso.classList.remove("d-none");
  document.getElementById("formSenha").reset();
  mostrarToast("Senha atualizada.");
}

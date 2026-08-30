// ============================================
// PÁGINA: recuperar-senha.html
// ============================================

document.getElementById("formRecuperar").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("msgResultado");
  const btn = document.getElementById("btnEnviar");
  msg.classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  const email = document.getElementById("email").value.trim();

  await sb.auth.resetPasswordForEmail(email, {
    redirectTo: linkAbsoluto("redefinir-senha.html"),
  });

  btn.disabled = false;
  btn.textContent = "Enviar link";

  // Sempre mostramos a mesma mensagem de sucesso, exista ou não o e-mail
  // cadastrado — assim ninguém consegue descobrir quem tem conta no sistema.
  msg.className = "alert alert-success";
  msg.textContent = "Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha em instantes. Confira também a caixa de spam.";
  document.getElementById("formRecuperar").reset();
});

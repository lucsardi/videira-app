// ============================================
// PÁGINA: novo.html (cadastrar ou editar, dependendo de ?id=)
// ============================================

const parametros = new URLSearchParams(window.location.search);
const idEdicao = parametros.get("id"); // null = modo cadastro novo
let ARQUIVO_FOTO = null;
let FOTO_ATUAL_URL = null;
let REMOVER_FOTO = false;
let CONEXAO_TRAVADA = null; // se o usuário é líder (não-admin), trava a conexão dele
let CONEXOES_DISPONIVEIS = []; // usada tanto no select de conexão quanto nos checkboxes de liderança
let TODAS_PESSOAS_CONJUGE = []; // lista pra popular o select de cônjuge vinculado

(async () => {
  const sessao = await exigirLogin();
  if (!sessao) return;

  const menu = await montarLayout("novo.html");

  document.getElementById("linkCancelar").href = paginaVoltar();

  // Só quem pode editar acessa esta tela
  if (!menu?.podeEditar) {
    window.location.href = "membros.html";
    return;
  }
  // Editar um cadastro existente exige poder editar (já checado acima) —
  // o RLS do banco também impede editar fora da própria conexão.

  // Popula os selects de mês
  document.querySelectorAll("#mes, #mesCasamento").forEach((select) => {
    MESES.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i + 1;
      opt.textContent = m;
      select.appendChild(opt);
    });
  });

  // Popula/trava o select de conexões
  const selectConexao = document.getElementById("conexao");
  if (!menu.ehAdmin) {
    // Líder: só pode cadastrar na própria conexão
    CONEXAO_TRAVADA = menu.perfil?.connection_id || null;
    if (CONEXAO_TRAVADA) {
      const { data: minhaConexao } = await sb
        .from("connections").select("*").eq("id", CONEXAO_TRAVADA).single();
      if (minhaConexao) CONEXOES_DISPONIVEIS = [minhaConexao];
      const opt = document.createElement("option");
      opt.value = CONEXAO_TRAVADA;
      opt.textContent = minhaConexao?.name || "Minha conexão";
      selectConexao.appendChild(opt);
      selectConexao.value = CONEXAO_TRAVADA;
      selectConexao.disabled = true;
      document.getElementById("avisoConexaoFixa").classList.remove("d-none");
    } else {
      document.getElementById("msgErro").textContent =
        "Seu usuário ainda não tem uma conexão definida. Peça para o administrador configurar isso na tela de Usuários.";
      document.getElementById("msgErro").classList.remove("d-none");
      document.getElementById("btnSalvar").disabled = true;
    }
  } else {
    const { data: conexoes } = await sb.from("connections").select("*").order("name");
    CONEXOES_DISPONIVEIS = conexoes || [];
    CONEXOES_DISPONIVEIS.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      selectConexao.appendChild(opt);
    });
  }

  // Popula o select de "cônjuge já cadastrado aqui" (RLS já limita ao que essa pessoa pode ver)
  const { data: pessoasParaConjuge } = await sb
    .from("people")
    .select("id, full_name")
    .order("full_name");
  TODAS_PESSOAS_CONJUGE = (pessoasParaConjuge || []).filter((p) => p.id !== idEdicao);

  const selectConjuge = document.getElementById("conjugeVinculado");
  TODAS_PESSOAS_CONJUGE.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.full_name;
    selectConjuge.appendChild(opt);
  });
  selectConjuge.addEventListener("change", () => {
    if (selectConjuge.value) {
      const escolhida = TODAS_PESSOAS_CONJUGE.find((p) => p.id === selectConjuge.value);
      document.getElementById("conjuge").value = escolhida?.full_name || "";
    }
  });

  // ---------- Liderança ----------
  const ehLiderCheckbox = document.getElementById("ehLiderCheckbox");
  const blocoTipoLideranca = document.getElementById("blocoTipoLideranca");
  const blocoConexoesLideranca = document.getElementById("blocoConexoesLideranca");

  function atualizarVisibilidadeConexoesLideranca() {
    const selecionado = document.querySelector('input[name="tipoLideranca"]:checked')?.value;
    const mostrar = selecionado === "leader" || selecionado === "leader_pastor";
    blocoConexoesLideranca.classList.toggle("d-none", !mostrar);
  }

  function renderizarCheckboxesLideranca(idsSelecionados = []) {
    const container = document.getElementById("listaConexoesLideranca");
    if (CONEXOES_DISPONIVEIS.length === 0) {
      container.innerHTML = `<p class="text-muted small mb-0">Nenhuma conexão disponível.</p>`;
      return;
    }
    container.innerHTML = CONEXOES_DISPONIVEIS.map((c) => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${c.id}" id="lideranca-${c.id}" ${idsSelecionados.includes(c.id) ? "checked" : ""}>
        <label class="form-check-label small" for="lideranca-${c.id}">${escapeHtml(c.name)}</label>
      </div>
    `).join("");
  }

  ehLiderCheckbox.addEventListener("change", (e) => {
    blocoTipoLideranca.classList.toggle("d-none", !e.target.checked);
    if (!e.target.checked) {
      document.querySelectorAll('input[name="tipoLideranca"]').forEach((r) => (r.checked = false));
      blocoConexoesLideranca.classList.add("d-none");
    }
  });

  document.querySelectorAll('input[name="tipoLideranca"]').forEach((radio) => {
    radio.addEventListener("change", atualizarVisibilidadeConexoesLideranca);
  });

  // Upload de foto: clique na área de preview ou no botão abrem o seletor de arquivo
  const inputFoto = document.getElementById("inputFoto");
  const btnRemoverFoto = document.getElementById("btnRemoverFoto");
  document.getElementById("previewFoto").addEventListener("click", () => inputFoto.click());
  document.getElementById("btnEscolherFoto").addEventListener("click", () => inputFoto.click());
  inputFoto.addEventListener("change", () => {
    const arquivo = inputFoto.files[0];
    if (!arquivo) return;
    ARQUIVO_FOTO = arquivo;
    REMOVER_FOTO = false;
    const leitor = new FileReader();
    leitor.onload = (e) => {
      document.getElementById("previewFoto").innerHTML =
        `<img src="${e.target.result}" class="vd-avatar vd-avatar-lg" style="object-fit:cover;">`;
      btnRemoverFoto.classList.remove("d-none");
    };
    leitor.readAsDataURL(arquivo);
  });
  btnRemoverFoto.addEventListener("click", () => {
    ARQUIVO_FOTO = null;
    FOTO_ATUAL_URL = null;
    REMOVER_FOTO = true;
    inputFoto.value = "";
    document.getElementById("previewFoto").innerHTML = "📷";
    btnRemoverFoto.classList.add("d-none");
  });

  // Se for edição, carrega os dados da pessoa e preenche o formulário
  let idsLiderandoAtualmente = [];
  if (idEdicao) {
    document.getElementById("tituloPagina").textContent = "Editar aniversariante";
    document.getElementById("btnSalvar").textContent = "Salvar alterações";

    const { data: pessoa, error } = await sb
      .from("people")
      .select("*")
      .eq("id", idEdicao)
      .single();

    if (error || !pessoa) {
      window.location.href = "membros.html";
      return;
    }

    const { data: liderancasAtuais } = await sb
      .from("connection_leaders")
      .select("connection_id")
      .eq("person_id", idEdicao);
    idsLiderandoAtualmente = (liderancasAtuais || []).map((l) => l.connection_id);

    document.getElementById("nome").value = pessoa.full_name;
    document.getElementById("dia").value = pessoa.birth_day;
    document.getElementById("mes").value = pessoa.birth_month;
    if (!selectConexao.disabled) selectConexao.value = pessoa.connection_id || "";

    if (pessoa.leader_role) {
      ehLiderCheckbox.checked = true;
      blocoTipoLideranca.classList.remove("d-none");
      const radio = document.querySelector(`input[name="tipoLideranca"][value="${pessoa.leader_role}"]`);
      if (radio) radio.checked = true;
    }

    if (pessoa.photo_url) {
      FOTO_ATUAL_URL = pessoa.photo_url;
      document.getElementById("previewFoto").innerHTML =
        `<img src="${escapeHtml(pessoa.photo_url)}" class="vd-avatar vd-avatar-lg" style="object-fit:cover;">`;
      document.getElementById("btnRemoverFoto").classList.remove("d-none");
    }

    if (pessoa.wedding_day && pessoa.wedding_month) {
      document.getElementById("temCasamento").checked = true;
      document.getElementById("blocoCasamento").classList.remove("d-none");
      document.getElementById("diaCasamento").value = pessoa.wedding_day;
      document.getElementById("mesCasamento").value = pessoa.wedding_month;
      document.getElementById("conjuge").value = pessoa.spouse_name || "";
      if (pessoa.spouse_id) document.getElementById("conjugeVinculado").value = pessoa.spouse_id;
    }
  }

  renderizarCheckboxesLideranca(idsLiderandoAtualmente);
  atualizarVisibilidadeConexoesLideranca();

  document.getElementById("temCasamento").addEventListener("change", (e) => {
    document.getElementById("blocoCasamento").classList.toggle("d-none", !e.target.checked);
  });

  document.getElementById("formPessoa").addEventListener("submit", salvarPessoa);
})();

// Envia a foto para o Supabase Storage (bucket "avatars") e devolve a URL pública
async function enviarFoto(idPessoa) {
  if (!ARQUIVO_FOTO) return FOTO_ATUAL_URL;

  const extensao = ARQUIVO_FOTO.name.split(".").pop();
  const caminho = `${idPessoa}-${Date.now()}.${extensao}`;

  const { error } = await sb.storage.from("avatars").upload(caminho, ARQUIVO_FOTO, {
    upsert: true,
  });
  if (error) {
    // Antes esse erro ficava só no console e o cadastro salvava sem avisar.
    // Agora ele interrompe o salvamento e mostra a mensagem real na tela.
    throw new Error("Não foi possível enviar a foto: " + error.message);
  }

  const { data } = sb.storage.from("avatars").getPublicUrl(caminho);
  return data.publicUrl;
}

// Garante que a tabela connection_leaders reflita exatamente as conexões
// marcadas no formulário para essa pessoa (adiciona as novas, remove as que
// foram desmarcadas). Devolve uma lista de avisos, caso algo não dê certo
// (ex: uma conexão já bateu no limite de 4 líderes).
async function sincronizarLiderancas(personId, conexoesDesejadas) {
  const { data: atuais } = await sb
    .from("connection_leaders")
    .select("id, connection_id")
    .eq("person_id", personId);

  const avisos = [];

  const paraRemover = (atuais || []).filter((l) => !conexoesDesejadas.includes(l.connection_id));
  for (const l of paraRemover) {
    await sb.from("connection_leaders").delete().eq("id", l.id);
  }

  const idsJaExistentes = new Set((atuais || []).map((l) => l.connection_id));
  for (const conexaoId of conexoesDesejadas) {
    if (idsJaExistentes.has(conexaoId)) continue;
    const { error } = await sb.from("connection_leaders").insert({ connection_id: conexaoId, person_id: personId });
    if (error) avisos.push(error.message);
  }

  return avisos;
}

async function salvarPessoa(e) {
  e.preventDefault();

  const msgErro = document.getElementById("msgErro");
  const msgSucesso = document.getElementById("msgSucesso");
  const btnSalvar = document.getElementById("btnSalvar");

  msgErro.classList.add("d-none");
  msgSucesso.classList.add("d-none");
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  const temCasamento = document.getElementById("temCasamento").checked;
  const conexaoId = CONEXAO_TRAVADA || document.getElementById("conexao").value || null;

  const ehLider = document.getElementById("ehLiderCheckbox").checked;
  const leaderRole = ehLider
    ? (document.querySelector('input[name="tipoLideranca"]:checked')?.value || null)
    : null;
  const conexoesParaLiderar = (leaderRole === "leader" || leaderRole === "leader_pastor")
    ? Array.from(document.querySelectorAll('#listaConexoesLideranca input[type="checkbox"]:checked')).map((cb) => cb.value)
    : [];

  const payload = {
    full_name: document.getElementById("nome").value.trim(),
    birth_day: Number(document.getElementById("dia").value),
    birth_month: Number(document.getElementById("mes").value),
    connection_id: conexaoId,
    leader_role: leaderRole,
    is_leader: leaderRole !== null,
    wedding_day: temCasamento && document.getElementById("diaCasamento").value
      ? Number(document.getElementById("diaCasamento").value) : null,
    wedding_month: temCasamento && document.getElementById("mesCasamento").value
      ? Number(document.getElementById("mesCasamento").value) : null,
    spouse_name: temCasamento ? (document.getElementById("conjuge").value.trim() || null) : null,
    spouse_id: temCasamento ? (document.getElementById("conjugeVinculado").value || null) : null,
  };

  let resultado;
  try {
    if (idEdicao) {
      if (ARQUIVO_FOTO) payload.photo_url = await enviarFoto(idEdicao);
      else if (REMOVER_FOTO) payload.photo_url = null;
      resultado = await sb.from("people").update(payload).eq("id", idEdicao).select().single();
    } else {
      resultado = await sb.from("people").insert(payload).select().single();
      if (!resultado.error && ARQUIVO_FOTO) {
        const url = await enviarFoto(resultado.data.id);
        await sb.from("people").update({ photo_url: url }).eq("id", resultado.data.id);
      }
    }
  } catch (erroFoto) {
    // Falha no upload da foto (ex: permissão do storage) — não perde o resto do formulário
    btnSalvar.disabled = false;
    btnSalvar.textContent = idEdicao ? "Salvar alterações" : "Salvar aniversariante";
    msgErro.textContent = erroFoto.message;
    msgErro.classList.remove("d-none");
    return;
  }

  if (resultado.error) {
    btnSalvar.disabled = false;
    btnSalvar.textContent = idEdicao ? "Salvar alterações" : "Salvar aniversariante";
    msgErro.textContent = "Não foi possível salvar: " + resultado.error.message;
    msgErro.classList.remove("d-none");
    return;
  }

  // Atualiza quais conexões essa pessoa lidera (tabela connection_leaders)
  const idPessoaFinal = idEdicao || resultado.data.id;
  const avisos = await sincronizarLiderancas(idPessoaFinal, conexoesParaLiderar);

  btnSalvar.disabled = false;
  btnSalvar.textContent = idEdicao ? "Salvar alterações" : "Salvar aniversariante";

  if (avisos.length > 0) {
    mostrarToast("Aniversariante salvo, mas houve um problema com a liderança: " + avisos.join("; "), "danger");
  }

  if (idEdicao) {
    window.location.href = paginaVoltar();
    return;
  }

  msgSucesso.classList.remove("d-none");
  document.getElementById("formPessoa").reset();
  document.getElementById("blocoCasamento").classList.add("d-none");
  document.getElementById("blocoTipoLideranca").classList.add("d-none");
  document.getElementById("blocoConexoesLideranca").classList.add("d-none");
  document.getElementById("previewFoto").innerHTML = "📷";
  document.getElementById("btnRemoverFoto").classList.add("d-none");
  document.getElementById("conjugeVinculado").value = "";
  ARQUIVO_FOTO = null;
  FOTO_ATUAL_URL = null;
  REMOVER_FOTO = false;
  if (CONEXAO_TRAVADA) document.getElementById("conexao").value = CONEXAO_TRAVADA;
  setTimeout(() => msgSucesso.classList.add("d-none"), 3000);
}

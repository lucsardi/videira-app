// ============================================
// AUTENTICAÇÃO E PERMISSÕES
// Funções compartilhadas por todas as páginas
// ============================================

// Garante que o usuário está logado. Se não estiver, manda pro login.
async function exigirLogin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

// Busca o "profile" (role, connection_id) do usuário logado
async function buscarPerfil(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil:", error.message);
    return null;
  }
  return data;
}

async function sair() {
  await sb.auth.signOut();
  window.location.href = "login.html";
}

// ---------- Regras de permissão (espelham o RLS do banco) ----------
// Papéis: admin | leader_view | leader_editor | leader_manager

function ehAdmin(perfil) {
  return perfil?.role === "admin";
}

function podeEditar(perfil) {
  return ["admin", "leader_editor", "leader_manager"].includes(perfil?.role);
}

function podeExcluir(perfil) {
  return ["admin", "leader_manager"].includes(perfil?.role);
}

// Admin e "Visualização Total" veem a igreja inteira; os demais são restritos à própria conexão
function veTudo(perfil) {
  return ["admin", "viewer_all"].includes(perfil?.role);
}

// Só admin vê a igreja inteira; os demais são restritos à própria conexão
function conexaoEscopo(perfil) {
  return ehAdmin(perfil) ? null : perfil?.connection_id || null;
}

const ROTULOS_PAPEL = {
  admin: "Administrador",
  viewer_all: "Membro — Visualização Total",
  leader_view: "Membro — Visualização",
  leader_editor: "Líder — Editor",
  leader_manager: "Líder — Gestor",
};

function rotuloPapel(role) {
  return ROTULOS_PAPEL[role] || role;
}

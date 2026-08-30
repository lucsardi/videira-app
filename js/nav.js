// ============================================
// LAYOUT: sidebar (desktop), topbar e barra inferior (mobile)
// ============================================

// paginaAtual: nome do arquivo html atual, ex: "membros.html"
async function montarLayout(paginaAtual) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const perfil = await buscarPerfil(user.id);
  const admin = ehAdmin(perfil);
  const editar = podeEditar(perfil);

  // Itens que aparecem para todo mundo
  const itensBase = [
    { href: "index.html", label: "Dashboard", icone: "🏠" },
    { href: "membros.html", label: "Aniversariantes", icone: "🎂" },
  ];
  if (editar) {
    itensBase.push({ href: "novo.html", label: "Novo cadastro", icone: "➕" });
  }
  itensBase.push({ href: "relatorios.html", label: "Relatórios", icone: "📄" });

  // Itens só de admin
  const itensAdmin = admin
    ? [
        { href: "conexoes.html", label: "Conexões", icone: "🌿" },
        { href: "usuarios.html", label: "Usuários", icone: "👥" },
      ]
    : [];

  const todosItens = [...itensBase, ...itensAdmin];

  // ---------- Sidebar (desktop) ----------
  const sidebarHtml = `
    <aside class="vd-sidebar">
      <div class="mb-4 text-center">
        <img src="assets/images/logo_videira_app.png" alt="Videira App" style="max-width: 150px; width: 100%; height: auto;">
      </div>
      <nav class="flex-grow-1">
        ${todosItens.map((l) => `
          <a class="vd-nav-link ${paginaAtual === l.href ? "active" : ""}" href="${l.href}">
            <span>${l.icone}</span> ${l.label}
          </a>`).join("")}
      </nav>
      <div class="border-top pt-3 mt-3">
        <div class="small text-truncate mb-2" style="color: var(--vd-text-secondary);">
          ${escapeHtml(user.email)}<br>
          <span class="fw-semibold">${rotuloPapel(perfil?.role)}</span>
        </div>
        <a href="perfil.html" class="btn btn-outline-secondary btn-sm w-100 mb-2 ${paginaAtual === "perfil.html" ? "active" : ""}">👤 Meu perfil</a>
        <button class="btn btn-outline-secondary btn-sm w-100" onclick="sair()">Sair</button>
      </div>
    </aside>
  `;

  // ---------- Topbar (mobile) ----------
  const topbarHtml = `
    <header class="vd-topbar">
      <img src="assets/images/logo_videira_app.png" alt="Videira App" style="height: 26px; width: auto;">
      <button class="btn btn-sm btn-outline-secondary" onclick="sair()">Sair</button>
    </header>
  `;

  // ---------- Barra inferior (mobile) ----------
  const itensMobile = [
    { href: "index.html", label: "Início", icone: "🏠" },
    { href: "membros.html", label: "Aniversariantes", icone: "🎂" },
    ...(admin ? [{ href: "conexoes.html", label: "Conexões", icone: "🌿" }] : []),
  ];

  const paginasMenu = [
    ...(editar ? [{ href: "novo.html", label: "Novo cadastro", icone: "➕" }] : []),
    { href: "relatorios.html", label: "Relatórios", icone: "📄" },
    ...(admin ? [{ href: "usuarios.html", label: "Usuários", icone: "👥" }] : []),
    { href: "perfil.html", label: "Meu perfil", icone: "👤" },
  ];

  const bottomnavHtml = `
    <nav class="vd-bottomnav">
      ${itensMobile.map((l) => `
        <a href="${l.href}" class="${paginaAtual === l.href ? "active" : ""}">
          <span class="icone">${l.icone}</span>${l.label}
        </a>`).join("")}
      <button type="button" data-bs-toggle="offcanvas" data-bs-target="#menuMais" class="${paginasMenu.some(p => p.href === paginaAtual) ? "active" : ""}">
        <span class="icone">☰</span>Menu
      </button>
    </nav>

    <div class="offcanvas offcanvas-bottom" tabindex="-1" id="menuMais" style="border-radius: 20px 20px 0 0; max-height: 60vh;">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menu</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body">
        ${paginasMenu.map((l) => `
          <a href="${l.href}" class="d-flex align-items-center gap-2 py-2 text-decoration-none" style="color: var(--vd-graphite);">
            <span>${l.icone}</span> ${l.label}
          </a>`).join("")}
        <hr>
        <div class="small text-truncate mb-2" style="color: var(--vd-text-secondary);">
          ${escapeHtml(user.email)}<br>
          <span class="fw-semibold">${rotuloPapel(perfil?.role)}</span>
        </div>
        <button class="btn btn-outline-secondary btn-sm w-100" onclick="sair()">Sair</button>
      </div>
    </div>
  `;

  document.getElementById("app-sidebar").innerHTML = sidebarHtml;
  document.getElementById("app-topbar").innerHTML = topbarHtml;
  document.getElementById("app-bottomnav").innerHTML = bottomnavHtml;

  return {
    user,
    perfil,
    ehAdmin: admin,
    podeEditar: editar,
    podeExcluir: podeExcluir(perfil),
    veTudo: veTudo(perfil),
  };
}

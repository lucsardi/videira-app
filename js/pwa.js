// ============================================
// Registra o service worker (necessário pro Android/Chrome oferecer
// a opção de "Instalar app"). No iPhone isso não é necessário — lá a
// pessoa usa "Adicionar à Tela de Início" pelo menu de compartilhar do Safari.
// ============================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Se falhar (ex: rodando localmente sem https), não é grave —
      // o app continua funcionando normalmente, só não oferece instalação.
    });
  });
}

// ============================================
// Instalação com um toque (Android/Chrome) + instruções (iPhone/Safari)
// ============================================

let promptInstalacaoPendente = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstalacaoPendente = e;
  document.dispatchEvent(new CustomEvent("pwa-instalacao-disponivel"));
});

function appJaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

async function instalarAppAgora() {
  if (!promptInstalacaoPendente) return false;
  promptInstalacaoPendente.prompt();
  const resultado = await promptInstalacaoPendente.userChoice;
  promptInstalacaoPendente = null;
  return resultado.outcome === "accepted";
}

// Desenha um card convidando a pessoa a instalar o app, adaptado à plataforma.
// Use assim: renderizarBlocoInstalarApp("idDoContainer")
function renderizarBlocoInstalarApp(idContainer) {
  const container = document.getElementById(idContainer);
  if (!container || appJaInstalado()) return;

  if (ehIOS()) {
    container.innerHTML = `
      <div class="card p-3 mt-3" style="background: var(--vd-green-50); border-color: var(--vd-green-200);">
        <p class="fw-semibold small mb-2">📲 Adicione o Videira App à tela de início</p>
        <ol class="small mb-0 ps-3">
          <li>Toque no ícone de compartilhar <strong>⬆️</strong> na barra do Safari</li>
          <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
          <li>Toque em <strong>Adicionar</strong> — pronto, vira um ícone de app</li>
        </ol>
      </div>
    `;
    return;
  }

  // Android/Chrome: mostra o botão só quando o navegador avisar que pode instalar
  function mostrarBotao() {
    container.innerHTML = `
      <div class="card p-3 mt-3 text-center" style="background: var(--vd-green-50); border-color: var(--vd-green-200);">
        <p class="fw-semibold small mb-2">📲 Instale o Videira App no seu celular</p>
        <button type="button" class="btn btn-primary w-100" id="btnInstalarPwa">Instalar agora</button>
      </div>
    `;
    document.getElementById("btnInstalarPwa").addEventListener("click", async () => {
      const aceitou = await instalarAppAgora();
      if (aceitou) container.innerHTML = `<p class="text-success small mt-3">✅ App instalado!</p>`;
    });
  }

  if (promptInstalacaoPendente) {
    mostrarBotao();
  } else {
    document.addEventListener("pwa-instalacao-disponivel", mostrarBotao, { once: true });
  }
}

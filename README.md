# 🍇 Videira App

Plataforma para cadastrar aniversariantes por Conexão (célula), com fotos, relatórios em PDF
e 4 níveis de permissão. Feito com **HTML, Bootstrap e JavaScript puro** — sem framework, sem
build. Banco de dados e fotos: Supabase (gratuito). Hospedagem: Vercel ou GitHub Pages (gratuito).

## Estrutura dos arquivos
```
├── login.html            → tela de login (layout dividido)
├── index.html             → dashboard com indicadores
├── membros.html           → lista de aniversariantes com filtros
├── novo.html               → cadastrar/editar (com foto), via ?id=
├── relatorios.html        → gerar relatórios em PDF
├── conexoes.html          → gerenciar conexões (só admin)
├── usuarios.html          → definir papel/conexão de cada login (só admin)
├── css/theme.css          → Design System da Videira (cores, tipografia, forma)
├── css/style.css          → layout (sidebar, topbar, barra inferior)
├── js/config.js           → ⚠️ AQUI você coloca a URL e a chave do Supabase
├── js/utils.js            → funções de data e avatar
├── js/auth.js             → login/logout + regras de permissão
├── js/nav.js              → monta sidebar (desktop) e barra inferior (mobile)
└── js/*.js                → lógica de cada página
```

## Os 5 níveis de permissão
| Papel | Vê | Adiciona | Edita | Exclui | Gerencia conexões/usuários |
|---|---|---|---|---|---|
| **Administrador** | Igreja inteira | ✅ | ✅ | ✅ | ✅ |
| **Membro — Visualização Total** | Igreja inteira | — | — | — | — |
| **Membro — Visualização** | Só a própria conexão | — | — | — | — |
| **Líder — Editor** | Só a própria conexão | ✅ | ✅ | — | — |
| **Líder — Gestor** | Só a própria conexão | ✅ | ✅ | ✅ | — |

Essas regras são garantidas **no banco de dados** (Row Level Security do Supabase), não só
escondidas na tela — então são seguras de verdade.

---

## Passo 1 — Criar o projeto no Supabase

1. Acesse supabase.com → **New project**
2. Escolha um nome e uma senha para o banco (guarde essa senha)
3. Aguarde o projeto ficar pronto (~2 min)
4. Vá em **SQL Editor** → **New query**
5. Abra o arquivo `supabase.sql`, copie **todo o conteúdo** e cole no editor
6. Clique em **Run** — isso cria as tabelas, permissões, regras de segurança e o espaço de
   armazenamento das fotos (bucket `avatars`)
7. Vá em **Project Settings → API Keys** e copie:
   - A **Project URL**
   - A **Publishable key** (começa com `sb_publishable_...`) — nunca use a Secret key aqui

### Preencha o js/config.js
```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";
```

### Criar seu usuário administrador
1. **Authentication → Users → Add user** → seu e-mail e senha → **Create user**
2. **Table Editor → profiles** → ache a linha do seu usuário → mude `role` de `leader_view` para `admin`

### Cadastrar as conexões
Pelo próprio site, logado como admin (menu **Conexões**), ou direto no SQL Editor:
```sql
insert into connections (name) values
  ('Conexão Vila Nova'),
  ('Conexão Centro');
```

### Dar acesso a um líder (direto pelo app, sem Supabase)
1. Logado como admin, vá na tela **Usuários** → preencha e-mail, papel e conexão →
   **Gerar link de convite**
2. Copie o link e envie por WhatsApp/e-mail para a pessoa
3. Ela abre o link, cria uma senha, e já entra com o papel e a conexão certos —
   o Supabase manda um e-mail de confirmação automaticamente (grátis, sem configurar nada)

**Importante:** vá em Supabase → Authentication → URL Configuration e defina o **Site URL**
com o endereço do seu app já publicado (ex: `https://seu-app.vercel.app/login.html`), senão
o link do e-mail de confirmação pode apontar para o lugar errado.

### Remover o acesso de alguém
Na tela **Usuários**, o botão **Remover acesso** tira a pessoa do sistema na hora (ela não
vê mais nada, mesmo que tente logar). O login dela continua existindo no Supabase — se quiser
apagá-lo de vez (por exemplo, para reusar aquele e-mail em outra conta), isso ainda precisa
ser feito uma vez em Authentication → Users → (⋮) → Delete user.

---

## Passo 2 — Testar localmente

Como o navegador bloqueia alguns recursos ao abrir um `.html` direto (protocolo `file://`),
use um servidor local simples:

**Opção A — Live Server no VS Code (mais fácil)**
1. Extensões → busque "Live Server" → Instale
2. Botão direito em `login.html` → **Open with Live Server**

**Opção B — Terminal com Python**
```bash
python -m http.server 8000
```
Acesse `http://localhost:8000/login.html`

---

## URLs sem .html (Vercel)
O arquivo `vercel.json` na raiz do projeto já configura isso — a Vercel esconde a extensão
`.html` da barra de endereço automaticamente (ex: `/membros.html` passa a aparecer como
`/membros`). Não precisa mudar nenhum link dentro do código, é só ter esse arquivo no
projeto antes do deploy.

---

## Passo 3 — Subir para o GitHub
```bash
git init
git add .
git commit -m "Primeira versão"
git remote add origin https://github.com/SEU-USUARIO/videira-app.git
git branch -M main
git push -u origin main
```

## Passo 4 — Publicar (grátis)

**Vercel:** vercel.com → Add New → Project → selecione o repositório → Framework Preset **Other** → Deploy.

**GitHub Pages:** no repositório, Settings → Pages → Branch `main`, pasta `/ (root)` → Save.

---

## Importando sua planilha do Excel
Veja `IMPORTAR_EXCEL.md`.

## Dúvidas comuns

**As fotos não aparecem / erro ao enviar foto**
Confira se o script `supabase.sql` rodou até o fim (ele cria o bucket `avatars` no Storage).
Vá em Supabase → Storage e confirme que o bucket `avatars` existe e está marcado como público.

**Um líder não consegue ver ninguém**
Ele provavelmente ainda não tem uma conexão definida. Vá em **Usuários** (como admin) e
escolha a conexão dele.

**Erro de CORS ou tela em branco ao abrir com duplo clique**
Use o Passo 2 (Live Server ou Python) — abrir com `file://` direto não funciona bem com o Supabase.

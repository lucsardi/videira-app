# 🔧 Guia de Debug - Firebase Authentication

## ✅ Passos para verificar o login

### 1. **Abra o Console do Navegador**
   - Pressione `F12` ou `Ctrl+Shift+I`
   - Clique na aba **Console**
   - Tente fazer login
   - Procure pelas mensagens de log

### 2. **Possíveis Erros e Soluções**

#### ❌ "Tentando fazer login com: (vazio)"
- **Problema**: O email está vazio ou com espaços
- **Solução**: Certifique-se que está copiando o email corretamente

#### ❌ "auth/user-not-found"
- **Problema**: Usuário não foi criado no Firebase Authentication
- **Solução**: 
  1. Vá para [Firebase Console](https://console.firebase.google.com/)
  2. Abra seu projeto **videira-app-7a9e1**
  3. Vá para **Authentication** > **Users**
  4. Verifique se o usuário com esse email existe
  5. Se não existir, clique **Create user** e crie com email/senha

#### ❌ "auth/wrong-password"
- **Problema**: A senha está incorreta
- **Solução**: Verifique a senha no Firebase ou resete-a

#### ❌ "auth/invalid-email"
- **Problema**: Formato de email inválido
- **Solução**: Certifique-se que é um email válido (ex: user@email.com)

#### ✅ "Login bem-sucedido! UID: xxxx"
- **Próxima verificação**: O sistema vai procurar o role no Firestore

#### ⚠️ "Documento do usuário não encontrado no Firestore"
- **Não é um erro!** O usuário vai fazer login como "user"
- **Opcional**: Para definir admin, crie um documento em Firestore:
  - Collection: `members`
  - Document ID: (use o UID do usuário)
  - Campo: `role` = `admin` ou `user`

### 3. **Exemplo de UID e Documento Firestore**

Se o UID do seu usuário é: `abc123xyz789`

Crie um documento assim:
```
Firestore
├── members (coleção)
│   └── abc123xyz789 (documento)
│       ├── role: "admin"
│       └── name: "Seu Nome"
```

### 4. **Passos Rápidos - Crie um Usuário no Firebase**

**Via Firebase Console:**
1. Acesse [console.firebase.google.com](https://console.firebase.google.com/)
2. Selecione o projeto **videira-app-7a9e1**
3. Vá para **Build** > **Authentication**
4. Clique em **Create user** ou **Add user**
5. Preencha:
   - Email: `seu-email@email.com`
   - Password: `sua-senha`
6. Clique **Create user**

**Via CLI (opcional):**
```bash
firebase auth:create-user --uid=123 --email=user@email.com --password=senha123
```

### 5. **Verificar Variáveis de Ambiente**

Abra `.env` e confirme que tem:
```
VITE_FIREBASE_API_KEY=AIzaSyCHwF_...
VITE_FIREBASE_AUTH_DOMAIN=videira-app-7a9e1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=videira-app-7a9e1
... (outras variáveis)
```

Se faltarem variáveis, copy/paste do Firebase Console:
- Projeto > ⚙️ Settings > Project settings
- Baixe o arquivo de configuração JSON e copie as chaves

---

## 📋 Checklist Final

- [ ] Login e senha criados no Firebase Authentication
- [ ] Variáveis de ambiente (.env) preenchidas
- [ ] Teste o login e verifique o console
- [ ] Procure por mensagens de erro específicas (user-not-found, wrong-password, etc)
- [ ] Se necessário, crie um documento no Firestore com o role

Boa sorte! 🚀

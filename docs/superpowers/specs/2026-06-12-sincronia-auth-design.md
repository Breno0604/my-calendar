# Sincronia Auth — Supabase Auth com Google OAuth

## Visão Geral

Adicionar autenticação ao Sincronia Calendar usando Supabase Auth com Google OAuth. Fase 1: acesso restrito ao proprietário via whitelist de emails. Preparado para evoluir para múltiplos usuários com rastreamento de autoria.

**Abordagem:** Autenticação mínima + schema evolutivo

---

## 1. Arquitetura

### Fluxo de Autenticação

```
Usuário acessa o app
  → Supabase Auth verifica sessão (cookie/localStorage)
    → Sessão válida? → Verifica whitelist → App
    → Sessão inválida? → Tela de login
      → "Entrar com Google" → OAuth flow
        → Login bem-sucedido → Verifica whitelist
          → Email autorizado → App
          → Email não autorizado → Logout + mensagem de erro
```

### Componentes

| Arquivo | Responsabilidade |
|---|---|
| `src/services/auth.js` | Login, logout, verificar sessão, obter usuário atual, verificar whitelist |
| `src/lib/supabaseClient.js` | Existente, sem mudanças |
| `src/App.vue` | Verifica sessão no `onMounted`, tela de login condicional, listener de auth |

### Não muda

- Nenhuma tabela existente (events, categories)
- Nenhum service existente (db.js, recurrence.js, etc.)
- Nenhuma rota (não há Vue Router)

---

## 2. Tela de Login

### Layout

Tela centralizada, fundo `--bg-primary`, card central com:
- Logo Sincronia (ícone + nome)
- Subtítulo: "Faça login para continuar"
- Botão "Entrar com Google" (estilo Google oficial)
- Rodapé: versão do app

### Estados

| Estado | Comportamento |
|---|---|
| **Carregando** | Spinner + "Verificando sessão..." |
| **Login** | Botão Google visível |
| **Erro** | Mensagem de erro + botão tentar novamente |
| **Logado** | Transição para o app (fade) |

### Botão Google

- Estilo: `height: 44px`, `border-radius: 8px`, `border: 1px solid --border`
- Hover: fundo `--bg-tertiary`
- Ícone Google SVG + texto "Entrar com Google"
- Click: `supabase.auth.signInWithOAuth({ provider: 'google' })`

### Fluxo pós-login

1. Supabase Auth retorna usuário com email
2. `auth.js` verifica tabela `allowed_emails`
3. Email encontrado → `currentUser` preenchido, app carrega
4. Email não encontrado → logout automático, mensagem "Acesso não autorizado"

---

## 3. Whitelist e Controle de Acesso

### Tabela no Supabase

```sql
CREATE TABLE allowed_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Policy: qualquer usuário autenticado pode verificar seu próprio email
CREATE POLICY "users_can_check_own_email"
ON allowed_emails FOR SELECT
TO authenticated
USING (email = auth.jwt()->>'email');
```

### Fluxo de verificação

```javascript
// auth.js
async function checkWhitelist(email) {
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', email.toLowerCase())
    .single();
  
  return { success: !error, data: !!data };
}
```

### Mensagens de erro

| Situação | Mensagem |
|---|---|
| Email não está na whitelist | "Acesso não autorizado. Solicite permissão ao administrador." |
| Falha de rede | "Erro de conexão. Tente novamente." |
| Logout manual | "Você saiu da sua conta." |

### UI para não-autorizado

- Tela de login permanece
- Botão Google habilitado (pode tentar outra conta)
- Mensagem de erro abaixo do botão (vermelho)
- Botão "Sair" para limpar sessão e tentar novamente

### Gerenciamento da whitelist

**Fase 1 (atual):**
- Emails adicionados manualmente via Supabase Dashboard
- SQL: `INSERT INTO allowed_emails (email) VALUES ('email@exemplo.com')`

**Fase 2 (futuro):**
- Painel admin no app (para emails marcados como `is_admin`)
- Interface para adicionar/remover emails

### Cache

Após verificação bem-sucedida, armazena `allowed: true` no localStorage.
Invalidado ao fazer logout.

---

## 4. Logout e Gerenciamento de Sessão

### Botão de Logout

**Localização:** Sidebar footer (ao lado do toggle de tema)

**Ícone:** Porta/saída (SVG)

**Comportamento:**
1. Click → modal de confirmação (usa sistema de modal existente do app)
2. "Deseja sair da sua conta?"
3. Botões: "Cancelar" e "Sair"
4. Confirma → `supabase.auth.signOut()`
5. Limpa `currentUser` ref
6. Limpa cache de whitelist
7. Redireciona para tela de login

### Gerenciamento de sessão

**Persistência:**
- Supabase Auth usa `localStorage` por padrão
- Ao carregar app: `supabase.auth.getSession()` verifica sessão
- Sessão expirada → tela de login
- Sessão válida → verifica whitelist → app

**Listener de mudanças:**

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') → tela de login
  if (event === 'TOKEN_REFRESHED') → renova token silenciosamente
})
```

**Timeout de sessão:**
- Padrão Supabase: 7 dias (configurável no dashboard)
- Após expiração → próxima interação exige login

### UI do usuário logado

**Sidebar footer (novo):**
- Avatar do usuário (24px, do Google OAuth) + primeiro nome
- Botão tema
- Botão logout (ação direta, sem dropdown)

---

## 5. Serviço auth.js

### Funções

```javascript
// Verifica sessão atual
async function getSession() → { success, data: { user, session } }

// Login com Google
async function signInWithGoogle() → { success, error }

// Logout
async function signOut() → { success, error }

// Verifica se email está na whitelist
async function checkWhitelist(email) → { success, data: boolean }

// Obtém usuário atual (dados vêm do Google OAuth)
function getCurrentUser() → { user, email, avatar, name }

// Listener de mudanças de auth
function onAuthStateChange(callback) → { unsubscribe }
```

### Contrato

Todas as funções seguem o padrão do projeto: `{ success, data, error }`.

---

## 6. Configuração do Supabase

### Passo a passo (documentar em documents/supabase.md)

1. **Ativar Google OAuth no Supabase:**
   - Authentication → Providers → Google
   - Criar OAuth 2.0 Client ID no Google Cloud Console
   - Adicionar redirect URL: `https://seu-projeto.supabase.co/auth/v1/callback`
   - Copiar Client ID e Secret para Supabase

2. **Criar tabela allowed_emails:**
   - SQL Editor → executar CREATE TABLE acima
   - Inserir seu email: `INSERT INTO allowed_emails (email) VALUES ('seu@email.com')`

3. **Configurar sessão:**
   - Authentication → Settings → Sessions
   - Time-to-live: 7 dias (padrão)

---

## 7. Critérios de Sucesso

1. **Acesso restrito:** apenas emails na whitelist podem fazer login
2. **Login simples:** um clique com Google
3. **Sessão persistente:** não perde login ao recarregar página
4. **Logout funcional:** botão na sidebar, confirmação, limpa sessão
5. **UX clara:** estados de carregamento, erro, sucesso bem definidos
6. **Preparado para evoluir:** schema permite adicionar múltiplos usuários depois

---

## 8. Evolução Futura (Fase 2)

Quando abrir para múltiplos usuários:

1. **Schema:**
   - Adicionar `created_by` (uuid) em `events` e `categories`
   - Adicionar `updated_by` (uuid) em `events`
   - Atualizar RLS policies para usar `auth.uid()`

2. **UI:**
   - Mostrar autor de cada evento ("Criado por João")
   - Histórico de alterações (quem editou, quando)

3. **Compartilhamento:**
   - Convites por email
   - Permissões por categoria (leitura/escrita)

4. **Admin:**
   - Painel para gerenciar usuários
   - Roles (admin/editor/viewer)

---

## 9. Não Escopo (Fase 1)

- Registro de novos usuários (apenas whitelist)
- Recuperação de senha (usamos OAuth)
- Perfis de usuário editáveis
- Múltiplos provedores OAuth (apenas Google)
- Compartilhamento de calendários
- Histórico de alterações
- Roles e permissões granulares

# Sincronia Auth — Google OAuth via Supabase Auth Hooks

## Architecture

Supabase Auth gerencia login/logout. O controle de acesso é feito **exclusivamente no servidor** via dois hooks Postgres:

1. **Before User Created** — bloqueia signup de emails não autorizados
2. **Custom Access Token (Before Token Issued)** — bloqueia login/refresh de emails removidos da lista após criados

Frontend apenas chama `signInWithGoogle`, `getSession`, `signOut` e escuta `onAuthStateChange`. Sem whitelist, sem RLS complicado, sem fallback demo mode.

## SQL (executar no Supabase SQL Editor)

### Tabela

```sql
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.allowed_emails DISABLE ROW LEVEL SECURITY;

-- Seed com seu email
INSERT INTO public.allowed_emails (email) VALUES ('seu@email.com');
```

### Hook: Before User Created

```sql
CREATE OR REPLACE FUNCTION public.before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  email TEXT;
BEGIN
  email := event->'user'->>'email';
  IF NOT EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = before_user_created.email) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Email não autorizado.'));
  END IF;
  RETURN '{}'::jsonb;
END;
$$;
```

### Hook: Custom Access Token

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  email TEXT;
BEGIN
  email := event->'claims'->>'email';
  IF email IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = custom_access_token_hook.email) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Acesso revogado.'));
  END IF;
  RETURN event;
END;
$$;
```

### Permissões

```sql
GRANT EXECUTE ON FUNCTION public.before_user_created TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.before_user_created FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.allowed_emails TO supabase_auth_admin;
```

## Configuração no Supabase Dashboard

1. **Authentication → Hooks → Before User Created**: selecionar "Postgres Function" → `public.before_user_created`
2. **Authentication → Hooks → Custom Access Token**: selecionar "Postgres Function" → `public.custom_access_token_hook`
3. **Authentication → URL Configuration → Redirect URLs**: adicionar `http://localhost:5173` e a URL de produção (Netlify)
4. **Authentication → Providers → Google**: habilitar, configurar Client ID e Client Secret do Google Cloud Console

## Data Flow

```
App inicia
  → checkUrlForError() (se veio do redirect OAuth com erro)
  → getSession()
    → se session existe → currentUser = session.user
    → se não → currentUser = null (mostra tela de login)
  → onAuthStateChange((event, session) => {
      SIGNED_IN → currentUser = session.user
      SIGNED_OUT → currentUser = null
    })

Usuário clica "Entrar com Google"
  → signInWithGoogle()
  → redireciona para Google
  → Google autoriza → Supabase processa
    → Before User Created verifica email na tabela
      → aprovado: cria usuário, redireciona de volta com token
      → rejeitado: redireciona de volta com ?error= na URL
  → App recarrega, checkUrlForError() captura erro se houver

Usuário existente faz login
  → Custom Access Token Hook verifica email na tabela
    → aprovado: token emitido, login OK
    → rejeitado: token negado, login falha
```

## Frontend

### `src/services/auth.js` (novo)

Reusa `getSupabase()` de `src/lib/supabaseClient.js`. Funções:

- `signInWithGoogle()` — redirect OAuth
- `signOut()` — limpa sessão
- `getSession()` — retorna sessão atual
- `onAuthStateChange(callback)` — escuta mudanças de auth
- `checkUrlForError()` — lê `?error=` da URL, limpa a URL, retorna mensagem ou `null`

### `src/App.vue`

**Script:**
- Import `* as authService from './services/auth.js'`
- Refs: `currentUser` (inicia `null` depois de verificar sessão), `loginError` (string)
- `onMounted`: inicia auth (check URL → getSession → onAuthStateChange)
- `handleLogin()`: chama `signInWithGoogle()`
- `handleLogout()`: chama `signOut()`, limpa `currentUser`

**Template:**
- `v-if="!currentUser"`: tela de login com logo, título, botão Google, mensagem de erro
- `v-else`: app existente (inalterado)

### `src/style.css`

Estilos para `.login-screen`, `.login-card`, `.google-login-btn`, `.login-error`, variantes dark.

## Observações

- **Erro na URL**: Quando o Before User Created hook rejeita, o Supabase redireciona de volta com `?error=...&error_description=...`. O `checkUrlForError()` captura e exibe.
- **Remoção posterior**: Se um email é removido da tabela `allowed_emails` após o usuário já existir, o Custom Access Token Hook bloqueia no próximo token refresh (toda nova sessão). O usuário existente no momento da remoção perde acesso ao renovar o token.
- **`events` e `categories`**: RLS já está desabilitado (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`). As funções dos hooks acessam `allowed_emails` com `supabase_auth_admin` via GRANT SELECT.
- **Gerenciamento da lista**: Inserir/remover emails diretamente na tabela `allowed_emails` via SQL Editor do Supabase Dashboard.

## Files Created/Modified

### Created
- `src/services/auth.js`
- `docs/superpowers/specs/2026-06-12-sincronia-auth-design.md`

### Modified
- `src/App.vue`
- `src/style.css`

### Unchanged
- `src/lib/supabaseClient.js` (reused as-is)
- `src/services/db.js` (no auth changes needed)
- Tests (no auth in tests — o login screen não afeta os testes existentes que usam seedStorage)

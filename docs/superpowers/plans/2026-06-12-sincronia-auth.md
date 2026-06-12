# Sincronia Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar autenticação ao Sincronia Calendar usando Supabase Auth com Google OAuth e whitelist de emails.

**Architecture:** Novo serviço `auth.js` gerencia login/logout/sessão. App.vue verifica sessão no onMounted e mostra tela de login condicional. Whitelist verificada via tabela `allowed_emails` no Supabase.

**Tech Stack:** Vue 3, Supabase Auth, Google OAuth

---

## File Structure

**Create:**
- `src/services/auth.js` — serviço de autenticação (login, logout, sessão, whitelist)

**Modify:**
- `src/App.vue` — adicionar estado de auth, tela de login, botão logout
- `src/style.css` — estilos da tela de login
- `documents/supabase.md` — documentação de configuração do Google OAuth

**No changes:**
- `src/lib/supabaseClient.js` — permanece igual
- `src/services/db.js` — permanece igual
- Tabelas existentes (events, categories)

---

### Task 1: Criar serviço auth.js

**Files:**
- Create: `src/services/auth.js`

- [ ] **Step 1: Criar estrutura do serviço auth.js**

Criar arquivo `src/services/auth.js`:

```javascript
/**
 * @module services/auth
 * Autenticação via Supabase Auth com Google OAuth.
 * Todas as funções seguem o contrato { success, data, error }.
 */

import { getSupabase } from '../lib/supabaseClient.js'

const WHITELIST_CACHE_KEY = 'sincronia_auth_allowed'

/**
 * Verifica sessão atual do usuário.
 * @returns {Promise<{success: boolean, data: {user: Object|null, session: Object|null}, error: string|null}>}
 * @example
 * const result = await getSession()
 * if (result.success && result.data.user) {
 *   console.log('Logado:', result.data.user.email)
 * }
 */
export async function getSession() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, data: null, error: 'Supabase não configurado' }
    }

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return { success: false, data: null, error: error.message }
    }

    return {
      success: true,
      data: {
        user: session?.user || null,
        session: session || null
      },
      error: null
    }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Inicia login com Google OAuth.
 * Redireciona o usuário para a página de consentimento do Google.
 * @returns {Promise<{success: boolean, data: null, error: string|null}>}
 * @example
 * const result = await signInWithGoogle()
 * if (!result.success) {
 *   console.error('Erro no login:', result.error)
 * }
 */
export async function signInWithGoogle() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, data: null, error: 'Supabase não configurado' }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      return { success: false, data: null, error: error.message }
    }

    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Realiza logout do usuário atual.
 * @returns {Promise<{success: boolean, data: null, error: string|null}>}
 * @example
 * const result = await signOut()
 * if (result.success) {
 *   // Redirecionar para tela de login
 * }
 */
export async function signOut() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, data: null, error: 'Supabase não configurado' }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, data: null, error: error.message }
    }

    // Limpar cache de whitelist
    localStorage.removeItem(WHITELIST_CACHE_KEY)

    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Verifica se o email está na whitelist de emails autorizados.
 * @param {string} email - Email do usuário
 * @returns {Promise<{success: boolean, data: boolean, error: string|null}>}
 * @example
 * const result = await checkWhitelist('user@example.com')
 * if (result.success && result.data) {
 *   // Email autorizado
 * }
 */
export async function checkWhitelist(email) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return { success: false, data: false, error: 'Supabase não configurado' }
    }

    if (!email) {
      return { success: false, data: false, error: 'Email não fornecido' }
    }

    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return { success: false, data: false, error: error.message }
    }

    const isAllowed = !!data

    // Cache se autorizado
    if (isAllowed) {
      localStorage.setItem(WHITELIST_CACHE_KEY, 'true')
    }

    return { success: true, data: isAllowed, error: null }
  } catch (err) {
    return { success: false, data: false, error: err.message }
  }
}

/**
 * Obtém dados do usuário atual.
 * @returns {{user: Object|null, email: string|null, avatar: string|null, name: string|null}}
 * @example
 * const user = getCurrentUser()
 * if (user) {
 *   console.log('Nome:', user.name)
 * }
 */
export function getCurrentUser() {
  const supabase = getSupabase()
  if (!supabase) {
    return { user: null, email: null, avatar: null, name: null }
  }

  // Tenta obter do cache da sessão
  const session = supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    return { user: null, email: null, avatar: null, name: null }
  }

  // Extrai dados do metadata do Google
  const metadata = user.user_metadata || {}

  return {
    user: user,
    email: user.email,
    avatar: metadata.avatar_url || metadata.picture || null,
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuário'
  }
}

/**
 * Registra listener para mudanças de estado de autenticação.
 * @param {function} callback - Função chamada quando o estado muda
 * @param {string} callback.event - Evento: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION'
 * @param {Object|null} callback.session - Sessão atual
 * @returns {{data: {subscription: Object}}}
 * @example
 * const { data } = onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_OUT') {
 *     // Redirecionar para login
 *   }
 * })
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabase()
  if (!supabase) {
    return { data: { subscription: null } }
  }

  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Verifica se o usuário já foi verificado na whitelist (cache).
 * @returns {boolean}
 * @example
 * if (hasWhitelistCache()) {
 *   // Pular verificação de whitelist
 * }
 */
export function hasWhitelistCache() {
  return localStorage.getItem(WHITELIST_CACHE_KEY) === 'true'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.js
git commit -m "feat: add auth service with Google OAuth and whitelist"
```

---

### Task 2: Documentar configuração do Supabase Auth

**Files:**
- Modify: `documents/supabase.md`

- [ ] **Step 1: Adicionar seção de autenticação ao documento**

Adicionar ao final de `documents/supabase.md`:

```markdown
## Autenticação (Google OAuth)

### 1. Configurar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name: `Sincronia Calendar`
7. Em **Authorized redirect URIs**, adicione:
   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   ```
8. Clique em **Create**
9. Copie o **Client ID** e **Client Secret**

### 2. Ativar Google OAuth no Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard/)
2. Vá em **Authentication > Providers**
3. Clique em **Google**
4. Ative a chave **Enable**
5. Cole o **Client ID** e **Client Secret** do Google
6. Clique em **Save**

### 3. Criar tabela de whitelist

No **SQL Editor** do Supabase, execute:

```sql
-- Criar tabela de emails autorizados
CREATE TABLE allowed_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados podem verificar seu próprio email
CREATE POLICY "users_can_check_own_email"
ON allowed_emails FOR SELECT
TO authenticated
USING (email = auth.jwt()->>'email');

-- Inserir seu email (substitua pelo seu email real)
INSERT INTO allowed_emails (email) VALUES ('seu@email.com');
```

### 4. Configurar sessão

1. Vá em **Authentication > URL Configuration**
2. Em **Site URL**, confirme que está apontando para seu domínio:
   - Local: `http://localhost:5173`
   - Produção: `https://seu-site.netlify.app`
3. Em **Redirect URLs**, adicione ambos os URLs acima

### 5. Testar login

1. Execute o app localmente: `npm run dev`
2. Clique em "Entrar com Google"
3. Faça login com seu email Google
4. Verifique se foi redirecionado de volta ao app
5. Confirme que está logado (avatar aparece na sidebar)

### 6. Adicionar novos usuários

Para permitir acesso a outros emails:

```sql
INSERT INTO allowed_emails (email) VALUES ('novo.usuario@email.com');
```

Ou via **Table Editor** no Supabase Dashboard.
```

- [ ] **Step 2: Commit**

```bash
git add documents/supabase.md
git commit -m "docs: add Google OAuth setup instructions"
```

---

### Task 3: Adicionar estados de autenticação no App.vue

**Files:**
- Modify: `src/App.vue` (script setup)

- [ ] **Step 1: Adicionar imports do auth service**

No topo de `src/App.vue`, após os imports existentes (linha 10), adicionar:

```javascript
import * as authService from './services/auth.js'
```

- [ ] **Step 2: Adicionar estados de autenticação**

Após a linha `const isDarkMode = ref(false)` (linha 43), adicionar:

```javascript
// --- Auth State ---
const currentUser = ref(null)
const isAuthLoading = ref(true)
const authError = ref(null)
const showLogoutConfirm = ref(false)
```

- [ ] **Step 3: Adicionar função de inicialização de auth**

Após a função `getTodayStr()` (linha 36), adicionar:

```javascript
// --- Auth Functions ---
const initAuth = async () => {
  isAuthLoading.value = true
  authError.value = null

  // Verificar sessão atual
  const sessionResult = await authService.getSession()

  if (!sessionResult.success) {
    isAuthLoading.value = false
    authError.value = sessionResult.error
    return
  }

  const session = sessionResult.data.session

  if (session?.user) {
    // Verificar whitelist
    const whitelistResult = await authService.checkWhitelist(session.user.email)

    if (whitelistResult.success && whitelistResult.data) {
      // Email autorizado
      currentUser.value = authService.getCurrentUser()
      isAuthLoading.value = false
    } else {
      // Email não autorizado
      await authService.signOut()
      authError.value = 'Acesso não autorizado. Solicite permissão ao administrador.'
      isAuthLoading.value = false
    }
  } else {
    // Sem sessão
    isAuthLoading.value = false
  }
}

const handleLogin = async () => {
  authError.value = null
  const result = await authService.signInWithGoogle()
  
  if (!result.success) {
    authError.value = result.error
  }
  // Se sucesso, o Supabase redireciona para o Google
  // Ao voltar, onAuthStateChange será disparado
}

const handleLogout = async () => {
  const result = await authService.signOut()
  
  if (result.success) {
    currentUser.value = null
    showLogoutConfirm.value = false
  } else {
    authError.value = result.error
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: add auth state and functions to App.vue"
```

---

### Task 4: Integrar auth no onMounted do App.vue

**Files:**
- Modify: `src/App.vue` (onMounted)

- [ ] **Step 1: Modificar onMounted para verificar auth primeiro**

Substituir o bloco `onMounted(() => {` (linha 235) por:

```javascript
onMounted(async () => {
  // Load Dark Mode Preference
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  } else {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark')
  }

  // Initialize filters map
  initializeFilters()

  // Initialize auth
  await initAuth()

  // Setup auth state listener
  const { data: authListener } = authService.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Verificar whitelist após login
      const whitelistResult = await authService.checkWhitelist(session.user.email)
      
      if (whitelistResult.success && whitelistResult.data) {
        currentUser.value = authService.getCurrentUser()
        authError.value = null
        // Carregar dados do app
        await loadAppData()
      } else {
        // Email não autorizado
        await authService.signOut()
        authError.value = 'Acesso não autorizado. Solicite permissão ao administrador.'
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser.value = null
    }
  })

  // Se já logado, carregar dados
  if (currentUser.value) {
    await loadAppData()
  }

  // Keyboard shortcuts listener
  window.addEventListener('keydown', handleKeydown)

  // Notification permission + reminder interval
  ioService.requestNotificationPermission(Notification)
  syncReminderInterval()
  checkReminders()

  // --- Sync setup (multi-device) ---
  const sb = getSupabase()
  if (sb && currentUser.value) {
    const shouldSync = () => !showModal.value

    let syncing = false

    const doSync = async () => {
      if (!shouldSync() || syncing) return
      syncing = true

      const r = await Promise.all([
        dbService.fetchEvents(sb),
        dbService.fetchCategories(sb)
      ])

      if (r[0].success && r[0].data.length > 0) {
        events.value = r[0].data.map(e => ({
          ...e,
          timeStart: e.timeStart || e.time_start,
          timeEnd: e.timeEnd || e.time_end,
          categoryId: e.categoryId || e.category_id,
          subcategoryId: e.subcategoryId || e.subcategory_id
        }))
      }

      if (r[1].success && r[1].data.length > 0) {
        categoriesData.value = r[1].data
      }
      syncing = false
    }

    const onRealtimeChange = () => {
```

- [ ] **Step 2: Extrair lógica de carregamento de dados para função**

Após a função `handleLogout()`, adicionar:

```javascript
const loadAppData = async () => {
  // Initialize infinite scroll months
  initInfiniteScroll()

  // Load data from Supabase (sole source of truth)
  const sb = getSupabase()
  if (sb) {
    const catResult = await dbService.fetchCategories(sb)
    if (catResult.success && catResult.data.length > 0) {
      categoriesData.value = catResult.data
    }
    
    const evResult = await dbService.fetchEvents(sb)
    if (evResult.success && evResult.data.length > 0) {
      events.value = evResult.data.map(e => ({
        ...e,
        timeStart: e.timeStart || e.time_start,
        timeEnd: e.timeEnd || e.time_end,
        categoryId: e.categoryId || e.category_id,
        subcategoryId: e.subcategoryId || e.subcategory_id
      }))
    }
  } else {
    events.value = generateMockEvents()
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate auth check in onMounted"
```

---

### Task 5: Adicionar tela de login no template

**Files:**
- Modify: `src/App.vue` (template)

- [ ] **Step 1: Envolver app-container com condição de auth**

No template (linha 1167), substituir:

```vue
<template>
  <div class="app-container">
```

Por:

```vue
<template>
  <!-- Tela de Login -->
  <div v-if="isAuthLoading" class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-icon">S</div>
        <span class="logo-text">Sincronia</span>
      </div>
      <p class="auth-loading-text">Verificando sessão...</p>
      <div class="auth-spinner"></div>
    </div>
  </div>

  <div v-else-if="!currentUser" class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-icon">S</div>
        <span class="logo-text">Sincronia</span>
      </div>
      <p class="auth-subtitle">Faça login para continuar</p>
      
      <button @click="handleLogin" class="google-login-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
        <span>Entrar com Google</span>
      </button>

      <p v-if="authError" class="auth-error">{{ authError }}</p>

      <div class="auth-version">Sincronia v{{ version }}</div>
    </div>
  </div>

  <!-- App Principal -->
  <div v-else class="app-container">
```

- [ ] **Step 2: Commit**

```bash
git add src/App.vue
git commit -m "feat: add login screen template"
```

---

### Task 6: Adicionar botão de logout na sidebar

**Files:**
- Modify: `src/App.vue` (template)

- [ ] **Step 1: Adicionar informações do usuário e botão logout no footer**

No footer da sidebar (linha 1230), substituir:

```vue
<footer class="sidebar-footer" style="display: flex; justify-content: space-between; align-items: center;">
  <div class="footer-buttons" style="display: flex; gap: 8px;">
    <button @click="toggleTheme" class="theme-toggle-btn" title="Alternar Tema Escuro/Claro">
```

Por:

```vue
<footer class="sidebar-footer" style="display: flex; justify-content: space-between; align-items: center;">
  <!-- User info -->
  <div v-if="currentUser" class="user-info" style="display: flex; align-items: center; gap: 8px;">
    <img v-if="currentUser.avatar" :src="currentUser.avatar" :alt="currentUser.name" class="user-avatar-small" />
    <div v-else class="user-avatar-small user-avatar-placeholder">{{ currentUser.name?.charAt(0).toUpperCase() }}</div>
    <span class="user-name-small">{{ currentUser.name?.split(' ')[0] }}</span>
  </div>

  <div class="footer-buttons" style="display: flex; gap: 8px;">
    <button @click="toggleTheme" class="theme-toggle-btn" title="Alternar Tema Escuro/Claro">
```

- [ ] **Step 2: Adicionar botão de logout após botão de configurações**

Após o botão de configurações (linha 1244), adicionar:

```vue
<button @click="showLogoutConfirm = true" class="theme-toggle-btn" title="Sair">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
</button>
```

- [ ] **Step 3: Adicionar modal de confirmação de logout**

Antes do fechamento de `</template>` (final do arquivo), adicionar:

```vue
<!-- Logout Confirmation Modal -->
<div v-if="showLogoutConfirm" class="modal-overlay" @click.self="showLogoutConfirm = false">
  <div class="modal-content" style="max-width: 400px;">
    <div class="modal-header">
      <h3 class="modal-title">Sair da conta</h3>
      <button @click="showLogoutConfirm = false" class="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size: 14px; color: var(--text-secondary);">Deseja sair da sua conta?</p>
    </div>
    <div class="modal-footer">
      <button @click="showLogoutConfirm = false" class="btn-secondary">Cancelar</button>
      <button @click="handleLogout" class="btn-primary" style="background-color: var(--danger, #ef4444);">Sair</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: add user info and logout button to sidebar"
```

---

### Task 7: Adicionar estilos da tela de login

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Adicionar estilos da tela de login no final do arquivo**

Adicionar ao final de `src/style.css`:

```css
/* ============================================
   AUTH SCREEN STYLES
   ============================================ */

.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  padding: 16px;
}

.auth-card {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.auth-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.auth-logo .logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 24px;
}

.auth-logo .logo-text {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.auth-loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.auth-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 48px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.google-login-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--text-muted);
}

.google-login-btn:active {
  transform: scale(0.98);
}

.auth-error {
  margin-top: 16px;
  padding: 12px 16px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #dc2626;
  font-size: 13px;
  text-align: left;
}

.auth-version {
  margin-top: 32px;
  font-size: 11px;
  color: var(--text-muted);
}

.user-avatar-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent);
  color: white;
  font-weight: 600;
  font-size: 12px;
}

.user-name-small {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/style.css
git commit -m "feat: add auth screen and user info styles"
```

---

### Task 8: Testar fluxo de autenticação

**Files:**
- Run: `npm run dev`

- [ ] **Step 1: Configurar Supabase Auth**

Seguir as instruções em `documents/supabase.md`:
1. Configurar Google OAuth no Supabase Dashboard
2. Criar tabela `allowed_emails`
3. Inserir seu email na whitelist

- [ ] **Step 2: Testar fluxo de login**

1. Executar `npm run dev`
2. Acessar `http://localhost:5173`
3. Verificar que tela de login aparece
4. Clicar em "Entrar com Google"
5. Fazer login com seu email Google
6. Verificar que é redirecionado de volta ao app
7. Confirmar que avatar e nome aparecem na sidebar
8. Confirmar que dados do calendário carregam

- [ ] **Step 3: Testar fluxo de logout**

1. Clicar no botão de logout (ícone de porta)
2. Verificar que modal de confirmação aparece
3. Clicar em "Sair"
4. Verificar que é redirecionado para tela de login
5. Confirmar que dados não são mais acessíveis

- [ ] **Step 4: Testar whitelist**

1. Fazer logout
2. Tentar login com email diferente (não está na whitelist)
3. Verificar que mensagem de erro aparece: "Acesso não autorizado"
4. Confirmar que é feito logout automático

- [ ] **Step 5: Testar persistência de sessão**

1. Fazer login
2. Recarregar a página (F5)
3. Verificar que não precisa fazer login novamente
4. Confirmar que sessão persiste

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "test: verify auth flow works correctly"
```

---

### Task 9: Executar testes Playwright

**Files:**
- Run: `npm test`

- [ ] **Step 1: Rodar suite de testes**

Executar: `npm test`

Verificar se todos os testes passam. Se algum falhar:
1. Ler o erro para entender o que quebrou
2. Ajustar código conforme necessário
3. Rodar `npm test -- tests/[nome].spec.js` para testar isoladamente
4. Commit da correção

- [ ] **Step 2: Commit final (se necessário)**

```bash
git add .
git commit -m "test: fix failing tests after auth implementation"
```

---

## Summary

**Total tasks:** 9

**Estimated time:** 2-3 horas

**Key files:**
- `src/services/auth.js` — novo serviço de autenticação
- `src/App.vue` — tela de login, estados de auth, botão logout
- `src/style.css` — estilos da tela de login
- `documents/supabase.md` — documentação de configuração

**Verification:**
- Manual: testar fluxo de login/logout/whitelist
- Automated: `npm test` (74 testes Playwright)

**Commits:** 8-9 commits incrementais

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-12-sincronia-auth.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

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

    // Limpar dados de sessão do Supabase no localStorage
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    }

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

    // Primeiro tenta via RPC (bypass RLS), depois fallback para query direta
    let isAllowed = false
    let queryError = null

    const { data: rpcData, error: rpcError } = await supabase.rpc('check_email_allowed', {
      p_email: email.toLowerCase()
    })

    if (!rpcError && typeof rpcData === 'boolean') {
      isAllowed = rpcData
    } else {
      // Fallback: query direta (pode falhar se RLS estiver ativo)
      const { data, error } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email.toLowerCase())
        .single()

      if (error && error.code !== 'PGRST116') {
        queryError = error.message
      } else {
        isAllowed = !!data
      }
    }

    if (queryError) {
      return { success: false, data: false, error: queryError }
    }

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
export async function getCurrentUser() {
  const supabase = getSupabase()
  if (!supabase) {
    return { user: null, email: null, avatar: null, name: null }
  }

  // Tenta obter do cache da sessão
  const { data: { session } } = await supabase.auth.getSession()
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

/**
 * @module services/auth
 * Supabase Auth service — Google OAuth with server-side email whitelist.
 * All functions follow the { success, data, error } contract pattern.
 */

import { getSupabase } from '../lib/supabaseClient.js'

/**
 * Signs in with Google via OAuth redirect.
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null }>}
 */
export async function signInWithGoogle() {
  const sb = getSupabase()
  if (!sb) {
    return { success: false, data: null, error: 'Supabase não configurado' }
  }
  try {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
    return { success: true, data, error: null }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Signs the current user out.
 * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
 */
export async function signOut() {
  const sb = getSupabase()
  if (!sb) {
    return { success: false, data: null, error: 'Supabase não configurado' }
  }
  try {
    const { error } = await sb.auth.signOut()
    if (error) throw error
    return { success: true, data: null, error: null }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Retrieves the current session.
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null }>}
 */
export async function getSession() {
  const sb = getSupabase()
  if (!sb) {
    return { success: false, data: null, error: 'Supabase não configurado' }
  }
  try {
    const { data, error } = await sb.auth.getSession()
    if (error) throw error
    return { success: true, data: data.session, error: null }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Listens for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
 * @param {Function} callback - receives (event, session)
 * @returns {{ success: boolean, data: { unsubscribe: Function }, error: string|null }}
 */
export function onAuthStateChange(callback) {
  const sb = getSupabase()
  if (!sb || typeof sb.auth.onAuthStateChange !== 'function') {
    return { success: false, data: null, error: 'Supabase não configurado' }
  }
  try {
    const { data } = sb.auth.onAuthStateChange(callback)
    return {
      success: true,
      data: { unsubscribe: data.subscription.unsubscribe },
      error: null
    }
  } catch (err) {
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Checks the current URL for OAuth error parameters (hook rejection, cancellation).
 * If found, returns the error message and cleans the URL.
 * @returns {string|null}
 */
export function checkUrlForError() {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  const errorDescription = params.get('error_description')
  if (error) {
    const msg = errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : 'Login não autorizado. Seu email não está na lista de permissões.'
    window.history.replaceState({}, '', window.location.pathname)
    return msg
  }
  return null
}

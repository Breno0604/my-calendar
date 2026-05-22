import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

let _client = null

export function getSupabase() {
  if (!_client) {
    if (!supabaseUrl || !supabasePublishableKey) {
      return null
    }
    _client = createClient(supabaseUrl, supabasePublishableKey)
  }
  return _client
}

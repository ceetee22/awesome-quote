// Re-exports the singleton from lib/supabase.js so that all auth operations
// (login, signup, admin checks) share one GoTrueClient instance with db.js.
import { supabase } from './supabase'

export function createSupabaseBrowserClient() {
  return supabase
}

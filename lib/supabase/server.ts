import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const supabaseServer = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(c => cookieStore.set(c)),
    } }
  )
}

// Service-role client - ONLY for trusted server code that bypasses RLS
import { createClient } from '@supabase/supabase-js'
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

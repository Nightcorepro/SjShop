import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/store', '/profile', '/admin']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(c => req.cookies.set(c))
          res = NextResponse.next({ request: { headers: req.headers } })
          cs.forEach(c => res.cookies.set(c))
        },
    } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  if (!user && PROTECTED.some(p => path.startsWith(p)))
    return NextResponse.redirect(new URL('/login', req.url))

  if (user && path.startsWith('/admin')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin')
      return NextResponse.redirect(new URL('/store', req.url))
  }
  return res
}

export const config = { matcher: ['/store/:path*', '/profile/:path*', '/admin/:path*'] }

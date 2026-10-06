import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { Sidebar } from '@/components/sidebar'
import { supabaseServer } from '@/lib/supabase/server'

export const metadata = { title: 'Tix Store' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          {user ? <Sidebar profile={profile} /> : null}
          <main className={user ? 'md:pl-64 min-h-screen' : 'min-h-screen'}>{children}</main>
          <Toaster theme="dark" position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  )
}

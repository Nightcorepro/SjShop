'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Store, User, ShieldCheck, LogOut, Ticket, Sun, Moon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const sb = supabaseBrowser()
  const qc = useQueryClient()
  const [dark, setDark] = useState(true)

  const { data: bal } = useQuery({
    queryKey: ['balance'],
    queryFn: async () =>
      (await sb.from('profiles').select('tix_balance').eq('id', profile.id).single()).data?.tix_balance ?? 0,
    initialData: profile.tix_balance,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const ch = sb.channel('bal').on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
      () => qc.invalidateQueries({ queryKey: ['balance'] })
    ).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])

  const nav = [
    { href: '/store',   icon: Store,       label: 'Reward Store' },
    { href: '/profile', icon: User,        label: 'My Profile' },
    ...(profile.role === 'admin' ? [{ href: '/admin', icon: ShieldCheck, label: 'Admin Panel' }] : []),
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl max-md:hidden">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><Ticket size={20} /></div>
        <span className="text-lg font-bold">Tix Store</span>
      </div>

      <div className="mx-4 mb-4 glass rounded-2xl p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Balance</p>
        <p className="tix-glow text-3xl font-extrabold text-amber-400">⬡ {Number(bal).toLocaleString()}</p>
        <p className="text-xs text-zinc-500 mt-1">Tix available</p>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all
              ${pathname.startsWith(href) ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-2">
          <img src={profile.avatar_url ?? '/avatar.png'} className="h-9 w-9 rounded-full border border-white/15" alt="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile.display_name}</p>
            <span className={`badge ${profile.role === 'admin' ? 'bg-red-500/15 text-red-400' : 'bg-sky-500/15 text-sky-400'}`}>
              {profile.role === 'admin' ? <ShieldCheck size={11} /> : null}{profile.role}
            </span>
          </div>
          <button onClick={() => setDark(d => !d)} className="text-zinc-500 hover:text-zinc-200">{dark ? <Moon size={16} /> : <Sun size={16} />}</button>
          <button onClick={async () => { await sb.auth.signOut(); router.push('/login'); router.refresh() }}
            className="text-zinc-500 hover:text-red-400"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  )
}

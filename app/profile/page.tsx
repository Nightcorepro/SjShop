import { supabaseServer } from '@/lib/supabase/server'
import { ShieldCheck, Ticket, Mail, Link2 } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const providers = user.identities?.map(i => i.provider) ?? []

  const statusStyle: Record<string, string> = {
    pending:   'bg-amber-500/15 text-amber-400',
    fulfilled: 'bg-emerald-500/15 text-emerald-400',
    refunded:  'bg-zinc-500/15 text-zinc-400',
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8">
      <div className="glass rounded-3xl p-8 flex flex-wrap items-center gap-6">
        <img src={profile.avatar_url ?? '/avatar.png'} className="h-24 w-24 rounded-2xl border-2 border-amber-400/40" alt="" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            {profile.role === 'admin'
              ? <span className="badge bg-gradient-to-r from-red-500/25 to-orange-500/25 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,.3)]"><ShieldCheck size={12} /> Admin</span>
              : <span className="badge bg-sky-500/15 text-sky-400">Member</span>}
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400"><Mail size={14} /> {profile.email}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
            <Link2 size={14} /> Linked: {providers.map(p => <span key={p} className="badge bg-white/10 text-zinc-300 normal-case">{p}</span>)}
          </p>
        </div>
        <div className="glass rounded-2xl px-8 py-5 text-center">
          <Ticket className="mx-auto mb-1 text-amber-400" size={24} />
          <p className="tix-glow text-3xl font-extrabold text-amber-400">⬡ {profile.tix_balance.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Tix Balance</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Purchase History</h2>
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Cost</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(orders ?? []).map(o => (
                <tr key={o.id} className="hover:bg-white/[0.03] transition">
                  <td className="px-5 py-3.5 font-medium">{o.item_title}</td>
                  <td className="px-5 py-3.5 text-amber-400">⬡ {o.tix_spent.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3.5"><span className={`badge ${statusStyle[o.status]}`}>{o.status}</span></td>
                </tr>
              ))}
              {!orders?.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-zinc-500">No purchases yet — head to the store!</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

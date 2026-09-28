'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Search, Gift, MinusCircle, History } from 'lucide-react'
import { toast } from 'sonner'

export function GiftPanel() {
  const sb = supabaseBrowser()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const { data: results } = useQuery({
    queryKey: ['user-search', q],
    enabled: q.length > 1,
    queryFn: async () => {
      const like = `%${q}%`
      const { data } = await sb.from('profiles')
        .select('id, display_name, email, tix_balance, role')
        .or(`display_name.ilike.${like},email.ilike.${like},id.eq.${q}`)
        .limit(6)
      return data
    },
  })

  const { data: log } = useQuery({
    queryKey: ['tix-log'],
    queryFn: async () => (await sb.from('tix_transactions')
      .select('*, user:profiles!tix_transactions_user_id_fkey(display_name), actor:profiles!tix_transactions_actor_id_fkey(display_name)')
      .order('created_at', { ascending: false }).limit(50)).data,
  })

  const adjust = useMutation({
    mutationFn: async ({ amt, rsn }: { amt: number; rsn: string }) => {
      const { data, error } = await sb.rpc('admin_adjust_tix',
        { p_user: selected.id, p_amount: amt, p_reason: rsn })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (d) => {
      toast.success(`Done! New balance: ⬡ ${Number(d.new_balance).toLocaleString()}`)
      setAmount(''); setReason(''); setSelected(null); setQ('')
      qc.invalidateQueries({ queryKey: ['tix-log'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold"><Gift size={18} className="text-amber-400" /> Gift / Deduct Tix</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input className="input pl-10" placeholder="Search by name, email, or user ID…"
            value={q} onChange={e => { setQ(e.target.value); setSelected(null) }} />
          {results && !selected && (
            <div className="absolute z-10 mt-2 w-full glass rounded-xl overflow-hidden">
              {results.map(u => (
                <button key={u.id} onClick={() => setSelected(u)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/5 text-left transition">
                  <div><p className="font-medium">{u.display_name}</p><p className="text-xs text-zinc-500">{u.email}</p></div>
                  <span className="text-amber-400 text-sm">⬡ {u.tix_balance.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mt-5 space-y-3 animate-pop">
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 flex justify-between">
              <span className="font-medium">{selected.display_name}</span>
              <span className="text-amber-400">⬡ {selected.tix_balance.toLocaleString()}</span>
            </div>
            <input className="input" type="number" placeholder="Amount (use negative to deduct)" value={amount} onChange={e => setAmount(e.target.value)} />
            <input className="input" placeholder="Reason (optional note)" value={reason} onChange={e => setReason(e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-amber flex-1 justify-center" disabled={adjust.isPending || !amount}
                onClick={() => adjust.mutate({ amt: Math.abs(Number(amount)), rsn: reason })}>
                <Gift size={16} /> Grant
              </button>
              <button className="btn flex-1 justify-center bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                disabled={adjust.isPending || !amount}
                onClick={() => adjust.mutate({ amt: -Math.abs(Number(amount)), rsn: reason })}>
                <MinusCircle size={16} /> Deduct
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-bold"><History size={18} className="text-amber-400" /> Tix Activity Log</h2>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
          {(log ?? []).map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-medium text-amber-300">{t.actor?.display_name ?? 'System'}</span>
                  {' '}{t.amount > 0 ? 'granted' : 'deducted'}{' '}
                  <span className={t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {t.amount > 0 ? '+' : ''}{t.amount} Tix
                  </span>{' '}to <span className="font-medium">{t.user?.display_name}</span>
                </p>
                <p className="text-xs text-zinc-500">{t.reason ?? t.type} · {new Date(t.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

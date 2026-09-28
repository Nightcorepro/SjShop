'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export function OrdersPanel() {
  const sb = supabaseBrowser()
  const qc = useQueryClient()

  const { data: orders } = useQuery({
    queryKey: ['all-orders'],
    queryFn: async () => (await sb.from('orders')
      .select('*, profiles(display_name)').order('created_at', { ascending: false })).data,
  })

  const resolve = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'fulfill' | 'refund' }) => {
      const { data, error } = await sb.rpc('admin_resolve_order', { p_order: id, p_action: action })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: (_, v) => {
      toast.success(v.action === 'fulfill' ? 'Order fulfilled ✔' : 'Refunded — Tix returned to user')
      qc.invalidateQueries({ queryKey: ['all-orders'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-zinc-500">
          <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Tix</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {(orders ?? []).map(o => (
            <tr key={o.id} className="hover:bg-white/[0.03]">
              <td className="px-5 py-3.5">{o.profiles?.display_name}</td>
              <td className="px-5 py-3.5">{o.item_title}</td>
              <td className="px-5 py-3.5 text-amber-400">⬡ {o.tix_spent.toLocaleString()}</td>
              <td className="px-5 py-3.5 text-zinc-400">{new Date(o.created_at).toLocaleString()}</td>
              <td className="px-5 py-3.5"><span className={`badge ${o.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : o.status === 'fulfilled' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-400'}`}>{o.status}</span></td>
              <td className="px-5 py-3.5">
                {o.status === 'pending' && (
                  <div className="flex gap-2">
                    <button className="btn bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs hover:bg-emerald-500/25"
                      onClick={() => resolve.mutate({ id: o.id, action: 'fulfill' })}><CheckCircle2 size={13} /> Fulfill</button>
                    <button className="btn bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 text-xs hover:bg-red-500/25"
                      onClick={() => resolve.mutate({ id: o.id, action: 'refund' })}><RotateCcw size={13} /> Refund</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Ticket, Package, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ItemCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false)
  const sb = supabaseBrowser()
  const qc = useQueryClient()
  const out = item.stock < 1

  const { mutate: redeem, isPending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb.rpc('redeem_item', { p_item: item.id })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['balance'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success(`Redeemed "${d.item}"! New balance: ⬡ ${Number(d.new_balance).toLocaleString()}`)
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <div onClick={() => !out && setOpen(true)}
        className={`glass card-hover group overflow-hidden rounded-2xl ${out ? 'opacity-50 saturate-0 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="relative h-44 overflow-hidden">
          <img src={item.image_url} alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
          <span className="absolute left-3 top-3 badge bg-zinc-950/70 text-zinc-300 backdrop-blur">
            <Package size={11} /> {item.stock} in stock
          </span>
          <span className="tix-glow absolute bottom-3 right-3 flex items-center gap-1 rounded-xl bg-zinc-950/70 px-3 py-1 font-bold text-amber-400 backdrop-blur">
            <Ticket size={14} /> {item.price_tix.toLocaleString()}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-bold">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{item.description}</p>
          <button disabled={out}
            className={`mt-4 w-full justify-center btn ${out ? 'btn-ghost cursor-not-allowed' : 'btn-amber'}`}>
            {out ? 'Out of Stock' : 'Redeem'}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div className="glass w-full max-w-md rounded-3xl p-6 animate-pop" onClick={e => e.stopPropagation()}>
            <img src={item.image_url} className="h-40 w-full rounded-xl object-cover" alt="" />
            <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
            <p className="text-sm text-zinc-400">{item.description}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
              <span className="flex items-center gap-1 font-bold text-amber-400"><Ticket size={16} /> {item.price_tix.toLocaleString()} Tix</span>
              <span className="text-xs text-zinc-500"><Package size={12} className="inline" /> {item.stock} left</span>
            </div>
            <div className="mt-5 flex gap-3">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-amber flex-1 justify-center" disabled={isPending} onClick={() => redeem()}>
                {isPending ? 'Processing…' : <><CheckCircle2 size={16} /> Confirm</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

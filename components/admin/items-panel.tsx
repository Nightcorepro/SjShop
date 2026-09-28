'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

const empty = { title: '', description: '', image_url: '', price_tix: '', stock: '' }

export function ItemsPanel() {
  const sb = supabaseBrowser()
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: items } = useQuery({
    queryKey: ['admin-items'],
    queryFn: async () => (await sb.from('items').select('*').order('created_at', { ascending: false })).data,
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title, description: form.description, image_url: form.image_url,
        price_tix: Number(form.price_tix), stock: Number(form.stock),
      }
      const { error } = editingId
        ? await sb.from('items').update(payload).eq('id', editingId)
        : await sb.from('items').insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Item updated' : 'Item created')
      qc.invalidateQueries({ queryKey: ['admin-items'] })
      setForm(null); setEditingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('items').update({ active: false }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { toast.success('Item removed'); qc.invalidateQueries({ queryKey: ['admin-items'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEdit = (item: any) => { setForm({ ...item }); setEditingId(item.id) }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button className="btn-amber" onClick={() => { setForm({ ...empty }); setEditingId(null) }}>
          <Plus size={16} /> New Item
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Active</th><th className="px-5 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(items ?? []).map(i => (
              <tr key={i.id} className="hover:bg-white/[0.03]">
                <td className="px-5 py-3"><div className="flex items-center gap-3">
                  <img src={i.image_url} className="h-10 w-14 rounded-lg object-cover" alt="" />
                  <span className="font-medium">{i.title}</span></div></td>
                <td className="px-5 py-3 text-amber-400">⬡ {i.price_tix.toLocaleString()}</td>
                <td className="px-5 py-3">{i.stock}</td>
                <td className="px-5 py-3"><span className={`badge ${i.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-500'}`}>{i.active ? 'Live' : 'Hidden'}</span></td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => openEdit(i)}><Pencil size={13} /></button>
                    <button className="btn bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 text-xs hover:bg-red-500/25"
                      onClick={() => { if (confirm(`Delete "${i.title}"?`)) del.mutate(i.id) }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setForm(null)}>
          <div className="glass w-full max-w-lg rounded-3xl p-6 animate-pop" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">{editingId ? 'Edit Item' : 'Create Item'}</h3>
              <button onClick={() => setForm(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Title" value={form.title} onChange={set('title')} />
              <textarea className="input" placeholder="Description" rows={2} value={form.description} onChange={set('description')} />
              <input className="input" placeholder="Image URL" value={form.image_url} onChange={set('image_url')} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" type="number" placeholder="Tix price" value={form.price_tix} onChange={set('price_tix')} />
                <input className="input" type="number" placeholder="Stock qty" value={form.stock} onChange={set('stock')} />
              </div>
              <button className="btn-amber w-full justify-center" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

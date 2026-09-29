import { supabaseServer } from '@/lib/supabase/server'
import { ItemCard } from '@/components/item-card'

export const dynamic = 'force-dynamic'

export default async function StorePage() {
  const supabase = await supabaseServer()
  const { data: items } = await supabase.from('items').select('*').eq('active', true).order('created_at')
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reward Store</h1>
        <p className="mt-1 text-zinc-400">Spend your hard-earned Tix on exclusive rewards.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map(item => <ItemCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}

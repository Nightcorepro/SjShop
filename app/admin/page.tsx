import { supabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GiftPanel } from '@/components/admin/gift-panel'
import { OrdersPanel } from '@/components/admin/orders-panel'
import { ItemsPanel } from '@/components/admin/items-panel'

export default async function AdminPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/store')

  const tab = searchParams.tab ?? 'gift'

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="mb-6 text-2xl font-bold">Admin Panel</h1>
      <div className="mb-8 flex gap-2">
        {[['gift', '🎁 Tix Gifting'], ['orders', '📦 Orders'], ['items', '🛍️ Items']].map(([k, l]) => (
          <a key={k} href={`/admin?tab=${k}`}
            className={`btn ${tab === k ? 'btn-amber' : 'btn-ghost'}`}>{l}</a>
        ))}
      </div>
      {tab === 'gift' && <GiftPanel />}
      {tab === 'orders' && <OrdersPanel />}
      {tab === 'items' && <ItemsPanel />}
    </div>
  )
}

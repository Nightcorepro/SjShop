'use client'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Globe, MessagesSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const fn = mode === 'signin' ? sb.auth.signInWithPassword : sb.auth.signUp
    const { error } = await fn({ email, password })
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success(mode === 'signin' ? 'Welcome back!' : 'Check your email to confirm, then sign in.')
    if (mode === 'signin') { router.push('/store'); router.refresh() }
  }

  const oauth = async (provider: 'google' | 'discord') => {
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,.08),transparent_60%)]">
      <div className="glass w-full max-w-md rounded-3xl p-10 animate-pop">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400"><Ticket size={28} /></div>
          <h1 className="text-2xl font-bold">Tix Store</h1>
          <p className="text-sm text-zinc-400">Earn Tix. Redeem rewards.</p>
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input className="input" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn-amber w-full justify-center" disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
          <span className="h-px flex-1 bg-white/10" /> OR <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => oauth('google')} className="btn-ghost justify-center"><Globe size={16} /> Google</button>
          <button onClick={() => oauth('discord')} className="btn-ghost justify-center"><MessagesSquare size={16} /> Discord</button>
        </div>

        <button className="mt-6 w-full text-center text-sm text-amber-400/80 hover:text-amber-300"
          onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

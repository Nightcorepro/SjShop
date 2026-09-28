# Tix Store — Community Reward Store

Next.js 16 (App Router) + Supabase + Tailwind CSS + React Query + Sonner.

## Quick Start

1. **Install deps**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a project at https://supabase.com
   - Open the SQL Editor and paste the contents of `supabase/migrations/0001_init.sql`, then run it
   - Authentication → Providers: enable **Google** and **Discord** (add your OAuth client IDs/secrets)
   - Authentication → URL Configuration: add `http://localhost:3000/auth/callback` to Redirect URLs

3. **Env vars**
   ```bash
   cp .env.local.example .env.local
   # fill in your project URL, anon key, and service-role key
   ```

4. **Make yourself admin** (SQL editor):
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

5. **Run**
   ```bash
   npm run dev
   ```

## Structure

| Path | Purpose |
|---|---|
| `app/login` | Email/password + Google/Discord OAuth |
| `app/store` | Reward grid, redeem modal, atomic purchase RPC |
| `app/profile` | Profile, role badge, live Tix balance, purchase history |
| `app/admin` | Gift/deduct Tix, activity log, order fulfillment/refunds, item CRUD |
| `supabase/migrations/0001_init.sql` | Schema, RLS, atomic RPCs, seed items |

All Tix mutations are atomic Postgres functions (`redeem_item`, `admin_adjust_tix`,
`admin_resolve_order`) — race-condition safe with balance/stock locking.

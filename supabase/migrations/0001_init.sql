-- ===== ENUMS & TABLES =====
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url  text,
  email       text,
  role        text not null default 'user' check (role in ('user','admin')),
  tix_balance bigint not null default 0 check (tix_balance >= 0),
  created_at  timestamptz not null default now()
);

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  price_tix   bigint not null check (price_tix > 0),
  stock       int    not null default 0 check (stock >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id),
  item_id    uuid references public.items(id) on delete set null,
  item_title text not null,
  tix_spent  bigint not null,
  status     text not null default 'pending' check (status in ('pending','fulfilled','refunded')),
  created_at timestamptz not null default now()
);

create table public.tix_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id),
  amount     bigint not null,
  type       text not null check (type in ('grant','deduct','purchase','refund')),
  reason     text,
  actor_id   uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ===== INDEXES =====
create index on orders(user_id);
create index on tix_transactions(user_id);
create index on items(active);

-- ===== AUTO-CREATE PROFILE ON SIGNUP =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email,
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== HELPER: is_admin() =====
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ===== ATOMIC REDEEM =====
create or replace function public.redeem_item(p_item uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item items%rowtype;
  v_balance bigint;
  v_order uuid;
begin
  if v_user is null then return jsonb_build_object('error','Not authenticated'); end if;

  select * into v_item from items where id = p_item and active for update;
  if not found then return jsonb_build_object('error','Item not found'); end if;
  if v_item.stock < 1 then return jsonb_build_object('error','Out of stock'); end if;

  select tix_balance into v_balance from profiles where id = v_user for update;
  if v_balance < v_item.price_tix then
    return jsonb_build_object('error','Insufficient Tix','needed',v_item.price_tix,'have',v_balance);
  end if;

  update profiles set tix_balance = tix_balance - v_item.price_tix where id = v_user;
  update items      set stock = stock - 1 where id = p_item;

  insert into orders (user_id, item_id, item_title, tix_spent)
  values (v_user, p_item, v_item.title, v_item.price_tix)
  returning id into v_order;

  insert into tix_transactions (user_id, amount, type, reason, actor_id)
  values (v_user, -v_item.price_tix, 'purchase', 'Purchased: ' || v_item.title, v_user);

  return jsonb_build_object('ok', true, 'order_id', v_order,
            'new_balance', v_balance - v_item.price_tix, 'item', v_item.title);
end $$;

-- ===== ATOMIC ADMIN GIFT / DEDUCT =====
create or replace function public.admin_adjust_tix(p_user uuid, p_amount bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return jsonb_build_object('error','Forbidden'); end if;
  if p_amount = 0 then return jsonb_build_object('error','Amount cannot be 0'); end if;

  if p_amount < 0 then
    if (select tix_balance from profiles where id = p_user) < -p_amount then
      return jsonb_build_object('error','Deduction exceeds user balance');
    end if;
  end if;

  update profiles set tix_balance = tix_balance + p_amount where id = p_user;
  insert into tix_transactions (user_id, amount, type, reason, actor_id)
  values (p_user, p_amount, case when p_amount > 0 then 'grant' else 'deduct' end,
          p_reason, auth.uid());

  return jsonb_build_object('ok', true, 'new_balance',
    (select tix_balance from profiles where id = p_user));
end $$;

-- ===== ADMIN FULFILL / REFUND ORDER =====
create or replace function public.admin_resolve_order(p_order uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v orders%rowtype;
begin
  if not public.is_admin() then return jsonb_build_object('error','Forbidden'); end if;
  select * into v from orders where id = p_order for update;
  if not found then return jsonb_build_object('error','Order not found'); end if;
  if v.status <> 'pending' then return jsonb_build_object('error','Order already resolved'); end if;

  if p_action = 'fulfill' then
    update orders set status = 'fulfilled' where id = p_order;
  elsif p_action = 'refund' then
    update orders set status = 'refunded' where id = p_order;
    update profiles set tix_balance = tix_spent + tix_balance where id = v.user_id;
    insert into tix_transactions (user_id, amount, type, reason, actor_id)
    values (v.user_id, v.tix_spent, 'refund', 'Refund: ' || v.item_title, auth.uid());
  else
    return jsonb_build_object('error','Invalid action');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ===== ROW LEVEL SECURITY =====
alter table profiles enable row level security;
alter table items enable row level security;
alter table orders enable row level security;
alter table tix_transactions enable row level security;

create policy "profiles readable by all"  on profiles for select using (true);
create policy "users update own profile"  on profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "items readable"    on items for select using (active or public.is_admin());
create policy "items admin write" on items for all using (public.is_admin()) with check (public.is_admin());

create policy "own orders"          on orders for select using (auth.uid() = user_id or public.is_admin());
create policy "orders via rpc only" on orders for insert with check (false);

create policy "own transactions" on tix_transactions for select using (auth.uid() = user_id or public.is_admin());
create policy "tx via rpc only"  on tix_transactions for insert with check (false);

-- ===== SEED =====
insert into items (title, description, image_url, price_tix, stock) values
  ('Premium Study Notes',  'Complete semester notes, neatly organized PDF bundle.', 'https://picsum.photos/seed/notes/400/300',  250, 20),
  ('$10 Gift Card',        'Amazon gift card delivered by email within 24h.',        'https://picsum.photos/seed/gift/400/300',   800, 10),
  ('Custom Role',          'Pick a custom Discord role name & color for 30 days.',   'https://picsum.photos/seed/role/400/300',   500, 15),
  ('Group Badge',          'Exclusive golden badge shown on your profile.',          'https://picsum.photos/seed/badge/400/300', 1200, 5);

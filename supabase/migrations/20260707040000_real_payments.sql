-- Real Payments system migration for English Reflex Pro

-- Alter memberships plan check constraint to support basic and lifetime
alter table public.memberships drop constraint if exists memberships_plan_check;
alter table public.memberships add constraint memberships_plan_check check (plan in ('free', 'basic', 'pro', 'premium', 'lifetime'));

-- 1. Create payment_orders table
create table if not exists public.payment_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  amount numeric(10,2) not null,
  currency text not null default 'VND',
  provider text not null check (provider in ('bank_transfer', 'stripe', 'momo', 'vnpay', 'zalopay')),
  status text not null default 'pending' check (status in ('pending', 'pending_verification', 'paid', 'failed', 'expired', 'canceled', 'refunded')),
  order_code text not null unique,
  transfer_content text not null unique,
  checkout_url text,
  qr_url text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create payment_webhook_logs table
create table if not exists public.payment_webhook_logs (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  event_type text,
  payload jsonb,
  status text,
  error_message text,
  created_at timestamptz not null default now()
);

-- 3. Create payment_settings table
create table if not exists public.payment_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 4. Seed default payment settings
insert into public.payment_settings (key, value) values
('bank_transfer', '{"enabled": true, "account_name": "TRAN VAN TRUONG", "account_no": "19036789999018", "bank_name": "Techcombank", "branch": "Ha Noi"}'::jsonb),
('stripe', '{"enabled": true}'::jsonb),
('plans_pricing', '{"pro_monthly": 99000, "pro_yearly": 948000, "basic_monthly": 49000, "lifetime": 1999000}'::jsonb),
('general', '{"currency": "VND", "order_expiry_minutes": 15, "trial_days": 0}'::jsonb)
on conflict (key) do update set value = excluded.value;

-- 5. Enable RLS on new tables
alter table public.payment_orders enable row level security;
alter table public.payment_webhook_logs enable row level security;
alter table public.payment_settings enable row level security;

-- 6. Setup RLS policies
-- Users can view and insert their own orders, and can update status to 'canceled' or 'pending_verification'
drop policy if exists "Users can view own orders" on public.payment_orders;
create policy "Users can view own orders" on public.payment_orders
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.payment_orders;
create policy "Users can create own orders" on public.payment_orders
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own pending orders" on public.payment_orders;
create policy "Users can update own pending orders" on public.payment_orders
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id 
    and (status = 'canceled' or status = 'pending_verification')
  );

-- Only service role (server-side admin client) can view/manage webhook logs
drop policy if exists "Service role webhook access" on public.payment_webhook_logs;

-- Authenticated users can read payment settings (e.g. to fetch bank details or prices)
drop policy if exists "Authenticated users can read settings" on public.payment_settings;
create policy "Authenticated users can read settings" on public.payment_settings
  for select to authenticated using (true);

-- 7. Grant rights
grant select, insert, update on public.payment_orders to authenticated;
grant select on public.payment_settings to authenticated;

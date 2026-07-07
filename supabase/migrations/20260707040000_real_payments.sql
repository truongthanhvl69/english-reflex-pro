-- Real Payments system migration for English Reflex Pro

-- Drop old triggers, functions, and tables to guarantee clean recreation
drop trigger if exists on_membership_change on public.memberships;
drop function if exists public.sync_profile_membership_type() cascade;
drop trigger if exists on_membership_created on public.memberships;
drop function if exists public.sync_profile_subscription_tier() cascade;

drop table if exists public.payment_webhook_logs cascade;
drop table if exists public.payment_history cascade;
drop table if exists public.payment_orders cascade;
drop table if exists public.memberships cascade;
drop table if exists public.plans cascade;
drop table if exists public.payment_settings cascade;

-- 1. Create plans table
create table public.plans (
  id text primary key,
  name text not null,
  code text not null,
  amount numeric(10,2) not null,
  currency text not null default 'VND',
  interval text not null check (interval in ('month', 'year', 'lifetime', 'free')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed pricing plans
insert into public.plans (id, name, code, amount, currency, interval) values
('free', 'Gói Miễn Phí', 'FREE', 0.00, 'VND', 'free'),
('basic_monthly', 'Gói Basic Tháng', 'BASIC', 49000.00, 'VND', 'month'),
('pro_monthly', 'Gói Pro Tháng', 'PRO', 99000.00, 'VND', 'month'),
('pro_yearly', 'Gói Pro Năm', 'PRO', 948000.00, 'VND', 'year'),
('lifetime', 'Gói Trọn Đời', 'LIFETIME', 1999000.00, 'VND', 'lifetime')
on conflict (id) do update set 
  name = excluded.name, 
  code = excluded.code, 
  amount = excluded.amount, 
  interval = excluded.interval;

-- 2. Create payment_orders table
create table public.payment_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  plan_code text not null,
  amount numeric(10,2) not null,
  currency text not null default 'VND',
  provider text not null check (provider in ('bank_transfer', 'stripe', 'momo', 'vnpay', 'zalopay', 'mock')),
  status text not null default 'pending' check (status in ('pending', 'pending_verification', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  order_code text not null unique,
  transfer_content text not null unique,
  checkout_url text,
  qr_url text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create payment_history table
create table public.payment_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  order_id uuid references public.payment_orders(id) on delete set null,
  amount numeric(10,2) not null,
  currency text not null default 'VND',
  provider text not null,
  transaction_id text,
  status text not null check (status in ('pending', 'success', 'failed', 'refunded')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 4. Create payment_webhook_logs table
create table public.payment_webhook_logs (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  event text,
  payload jsonb,
  status text,
  error text,
  created_at timestamptz not null default now()
);

-- 5. Create memberships table
create table public.memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  membership_type text not null check (membership_type in ('free', 'basic', 'pro', 'premium', 'lifetime')),
  status text not null check (status in ('active', 'expired', 'cancelled', 'none')),
  started_at timestamptz not null default now(),
  expired_at timestamptz,
  auto_renew boolean not null default true,
  provider text,
  subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Create payment_settings table
create table public.payment_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seed default settings
insert into public.payment_settings (key, value) values
('bank_transfer', '{"enabled": true, "account_name": "TRAN VAN TRUONG", "account_no": "19036789999018", "bank_name": "Techcombank", "branch": "Ha Noi"}'::jsonb),
('stripe', '{"enabled": true}'::jsonb),
('plans_pricing', '{"pro_monthly": 99000, "pro_yearly": 948000, "basic_monthly": 49000, "lifetime": 1999000}'::jsonb),
('general', '{"currency": "VND", "order_expiry_minutes": 15, "trial_days": 0}'::jsonb)
on conflict (key) do update set value = excluded.value;

-- 7. Sync membership trigger function
create or replace function public.sync_profile_membership_type()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set membership_type = new.membership_type,
      subscription_tier = case 
        when new.membership_type = 'lifetime' then 'pro' 
        else new.membership_type 
      end,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

create trigger on_membership_change
  after insert or update on public.memberships
  for each row execute function public.sync_profile_membership_type();

-- 8. Enable Row Level Security (RLS)
alter table public.plans enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_history enable row level security;
alter table public.payment_webhook_logs enable row level security;
alter table public.memberships enable row level security;
alter table public.payment_settings enable row level security;

-- 9. Setup RLS Policies
-- Plans: Anyone can view plans
drop policy if exists "Anyone can read plans" on public.plans;
create policy "Anyone can read plans" on public.plans for select using (true);

-- Payment Orders: View/Create own, update only 'cancelled' or 'pending_verification' status
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
    and (status = 'cancelled' or status = 'pending_verification')
  );

-- Payment History: View own payments
drop policy if exists "Users can view own payments" on public.payment_history;
create policy "Users can view own payments" on public.payment_history
  for select to authenticated using (auth.uid() = user_id);

-- Memberships: View own membership
drop policy if exists "Users can view own membership" on public.memberships;
create policy "Users can view own membership" on public.memberships
  for select to authenticated using (auth.uid() = user_id);

-- Payment Settings: View settings
drop policy if exists "Authenticated users can read settings" on public.payment_settings;
create policy "Authenticated users can read settings" on public.payment_settings
  for select to authenticated using (true);

-- 10. Grant privileges
grant select on public.plans to authenticated;
grant select, insert, update on public.payment_orders to authenticated;
grant select on public.payment_history to authenticated;
grant select on public.memberships to authenticated;
grant select on public.payment_settings to authenticated;

-- 11. Force reload Schema Cache for PostgREST
notify pgrst, 'reload schema';

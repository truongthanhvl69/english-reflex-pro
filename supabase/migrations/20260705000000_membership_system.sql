-- Membership schema updates for English Reflex Pro

create table if not exists public.memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  status text not null default 'none' check (status in ('active', 'expired', 'canceled', 'none')),
  start_date timestamptz not null default now(),
  expired_at timestamptz,
  provider text,
  subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'VND',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  provider text not null,
  transaction_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.memberships enable row level security;
alter table public.payment_history enable row level security;
alter table public.subscription_logs enable row level security;

-- Policies for memberships
drop policy if exists "Users can view own membership" on public.memberships;
create policy "Users can view own membership" on public.memberships
  for select to authenticated using ((select auth.uid()) = user_id);

-- Policies for payment history
drop policy if exists "Users can view own payments" on public.payment_history;
create policy "Users can view own payments" on public.payment_history
  for select to authenticated using ((select auth.uid()) = user_id);

-- Profile subscription tier syncing function
create or replace function public.sync_profile_subscription_tier()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set subscription_tier = new.plan,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

-- Trigger for profile sync
drop trigger if exists tr_sync_profile_subscription_tier on public.memberships;
create trigger tr_sync_profile_subscription_tier
  after insert or update of plan, status on public.memberships
  for each row execute procedure public.sync_profile_subscription_tier();

-- Initialize free membership records for existing profiles that don't have one
insert into public.memberships (user_id, plan, status)
select id, 'free', 'active'
from public.profiles
on conflict (user_id) do nothing;

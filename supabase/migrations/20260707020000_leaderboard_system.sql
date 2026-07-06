-- Leaderboard views for daily, weekly, monthly, and total points
-- These views bypass RLS checks for basic profiles metadata securely by querying only safe columns.

-- 1. Total points leaderboard
create or replace view public.leaderboard_total as
select
  rank() over (order by exp desc, level desc) as rank,
  id as user_id,
  full_name as display_name,
  avatar_url as avatar,
  level,
  streak,
  exp,
  'Gold'::text as badge
from public.profiles;

-- 2. Daily points leaderboard
create or replace view public.leaderboard_today as
with today_exp as (
  select
    user_id,
    count(id) filter (where is_correct) * 10 as exp
  from public.user_sentence_history
  where created_at >= date_trunc('day', now())
  group by user_id
)
select
  rank() over (order by coalesce(te.exp, 0) desc, p.exp desc) as rank,
  p.id as user_id,
  p.full_name as display_name,
  p.avatar_url as avatar,
  p.level,
  p.streak,
  coalesce(te.exp, 0) as exp,
  'Gold'::text as badge
from public.profiles p
left join today_exp te on p.id = te.user_id;

-- 3. Weekly points leaderboard
create or replace view public.leaderboard_weekly as
with weekly_exp as (
  select
    user_id,
    count(id) filter (where is_correct) * 10 as exp
  from public.user_sentence_history
  where created_at >= date_trunc('week', now())
  group by user_id
)
select
  rank() over (order by coalesce(we.exp, 0) desc, p.exp desc) as rank,
  p.id as user_id,
  p.full_name as display_name,
  p.avatar_url as avatar,
  p.level,
  p.streak,
  coalesce(we.exp, 0) as exp,
  'Gold'::text as badge
from public.profiles p
left join weekly_exp we on p.id = we.user_id;

-- 4. Monthly points leaderboard
create or replace view public.leaderboard_monthly as
with monthly_exp as (
  select
    user_id,
    count(id) filter (where is_correct) * 10 as exp
  from public.user_sentence_history
  where created_at >= date_trunc('month', now())
  group by user_id
)
select
  rank() over (order by coalesce(me.exp, 0) desc, p.exp desc) as rank,
  p.id as user_id,
  p.full_name as display_name,
  p.avatar_url as avatar,
  p.level,
  p.streak,
  coalesce(me.exp, 0) as exp,
  'Gold'::text as badge
from public.profiles p
left join monthly_exp me on p.id = me.user_id;

-- 5. Grant permissions to authenticated users to view these rankings
grant select on public.leaderboard_total to authenticated;
grant select on public.leaderboard_today to authenticated;
grant select on public.leaderboard_weekly to authenticated;
grant select on public.leaderboard_monthly to authenticated;

-- 6. Enable postgres_changes realtime triggers on profiles and history
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.user_sentence_history;

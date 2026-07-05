-- User accounts and per-user learning data for English Reflex Pro.
-- This migration upgrades the original schema without deleting existing data.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'Learner',
  avatar_url text,
  exp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  total_answers integer not null default 0,
  correct_answers integer not null default 0,
  last_study_date date,
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text not null default 'Learner';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists exp integer not null default 0;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists streak integer not null default 0;
alter table public.profiles add column if not exists accuracy numeric(5,2) not null default 0;
alter table public.profiles add column if not exists total_answers integer not null default 0;
alter table public.profiles add column if not exists correct_answers integer not null default 0;
alter table public.profiles add column if not exists last_study_date date;
alter table public.profiles add column if not exists subscription_tier text not null default 'free';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
  ) then
    execute $sql$
      update public.profiles
      set full_name = display_name
      where (full_name is null or full_name = '' or full_name = 'Learner')
        and display_name is not null
    $sql$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'total_exp'
  ) then
    execute 'update public.profiles set exp = greatest(exp, total_exp)';
  end if;
end $$;

create table if not exists public.user_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  current_sentence_id text,
  completed_sentence_ids text[] not null default '{}',
  total_answers integer not null default 0 check (total_answers >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  accuracy numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  earned_exp integer not null default 0 check (earned_exp >= 0),
  is_unlocked boolean not null default true,
  is_completed boolean not null default false,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.user_sentence_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sentence_id text not null,
  lesson_id text not null,
  mode text not null check (mode in ('typing', 'word-bank', 'listening', 'reverse', 'speaking')),
  submitted_answer text,
  correct_answer text not null,
  is_correct boolean not null,
  response_time_ms integer check (response_time_ms is null or response_time_ms >= 0),
  marked_hard boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_sentence_history_user_created_idx
  on public.user_sentence_history(user_id, created_at desc);
create index if not exists user_sentence_history_review_idx
  on public.user_sentence_history(user_id, marked_hard, sentence_id);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  effects_enabled boolean not null default true,
  auto_play_correct boolean not null default true,
  effects_volume numeric(3,2) not null default 0.8 check (effects_volume between 0 and 1),
  voice_volume numeric(3,2) not null default 1 check (voice_volume between 0 and 1),
  speed_rate numeric(3,2) not null default 1 check (speed_rate between 0.5 and 2),
  voice_type text not null default 'us' check (voice_type in ('female', 'male', 'us', 'uk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  icon text,
  exp_reward integer not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_sentence_history enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_achievements enable row level security;
alter table public.achievements enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users update their own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users manage own progress" on public.user_progress;
create policy "Users manage own progress" on public.user_progress
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own sentence history" on public.user_sentence_history;
create policy "Users manage own sentence history" on public.user_sentence_history
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read own achievements" on public.user_achievements;
drop policy if exists "Users manage own achievements" on public.user_achievements;
create policy "Users manage own achievements" on public.user_achievements
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Achievements are readable" on public.achievements;
create policy "Achievements are readable" on public.achievements
  for select to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_name text;
  resolved_avatar text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(new.email, 'Learner'), '@', 1)
  );
  resolved_avatar := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, resolved_name, resolved_avatar)
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name in ('', 'Learner')
        then excluded.full_name
      else public.profiles.full_name
    end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(coalesce(u.email, 'Learner'), '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

insert into public.user_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.record_practice_answer(
  p_sentence_id text,
  p_lesson_id text,
  p_mode text,
  p_submitted_answer text,
  p_correct_answer text,
  p_is_correct boolean,
  p_response_time_ms integer default null,
  p_next_lesson_id text default null
)
returns table (exp integer, streak integer, accuracy numeric, lesson_accuracy numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  exp_gain integer := case when p_is_correct then 10 else 0 end;
  study_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  completed_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_mode not in ('typing', 'word-bank', 'listening', 'reverse', 'speaking') then
    raise exception 'Invalid practice mode';
  end if;

  insert into public.user_sentence_history (
    user_id, sentence_id, lesson_id, mode, submitted_answer, correct_answer,
    is_correct, response_time_ms
  ) values (
    current_user_id, p_sentence_id, p_lesson_id, p_mode, p_submitted_answer,
    p_correct_answer, p_is_correct, greatest(p_response_time_ms, 0)
  );

  insert into public.user_progress (
    user_id, lesson_id, current_sentence_id, completed_sentence_ids,
    total_answers, correct_answers, accuracy, earned_exp, last_studied_at
  ) values (
    current_user_id, p_lesson_id, p_sentence_id,
    case when p_is_correct then array[p_sentence_id] else '{}'::text[] end,
    1, case when p_is_correct then 1 else 0 end,
    case when p_is_correct then 100 else 0 end, exp_gain, now()
  )
  on conflict (user_id, lesson_id) do update set
    current_sentence_id = excluded.current_sentence_id,
    completed_sentence_ids = case
      when p_is_correct then array(
        select distinct unnest(public.user_progress.completed_sentence_ids || p_sentence_id)
      )
      else public.user_progress.completed_sentence_ids
    end,
    total_answers = public.user_progress.total_answers + 1,
    correct_answers = public.user_progress.correct_answers + case when p_is_correct then 1 else 0 end,
    accuracy = round(
      ((public.user_progress.correct_answers + case when p_is_correct then 1 else 0 end)::numeric * 100) /
      (public.user_progress.total_answers + 1), 2
    ),
    earned_exp = public.user_progress.earned_exp + exp_gain,
    last_studied_at = now(),
    updated_at = now()
  returning cardinality(completed_sentence_ids) into completed_count;

  update public.user_progress
  set is_completed = completed_count >= 10
  where user_id = current_user_id and lesson_id = p_lesson_id;

  if p_next_lesson_id is not null and completed_count >= 10 then
    insert into public.user_progress (user_id, lesson_id, is_unlocked)
    values (current_user_id, p_next_lesson_id, true)
    on conflict (user_id, lesson_id) do update
      set is_unlocked = true, updated_at = now();
  end if;

  update public.profiles p set
    exp = p.exp + exp_gain,
    streak = case
      when p.last_study_date = study_day then p.streak
      when p.last_study_date = study_day - 1 then p.streak + 1
      else 1
    end,
    last_study_date = study_day,
    total_answers = p.total_answers + 1,
    correct_answers = p.correct_answers + case when p_is_correct then 1 else 0 end,
    accuracy = round(
      ((p.correct_answers + case when p_is_correct then 1 else 0 end)::numeric * 100) /
      (p.total_answers + 1), 2
    ),
    level = greatest(1, floor((p.exp + exp_gain) / 1000.0)::integer + 1),
    updated_at = now()
  where p.id = current_user_id;

  -- Keep the original schema's EXP column in sync when upgrading it.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'total_exp'
  ) then
    execute 'update public.profiles set total_exp = exp where id = $1'
      using current_user_id;
  end if;

  return query
  select p.exp, p.streak, p.accuracy, up.accuracy
  from public.profiles p
  join public.user_progress up on up.user_id = p.id and up.lesson_id = p_lesson_id
  where p.id = current_user_id;
end;
$$;

revoke all on function public.record_practice_answer(text, text, text, text, text, boolean, integer, text) from public;
grant execute on function public.record_practice_answer(text, text, text, text, text, boolean, integer, text) to authenticated;

create or replace function public.set_sentence_marked_hard(p_sentence_id text, p_marked_hard boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.user_sentence_history
  set marked_hard = p_marked_hard
  where user_id = auth.uid() and sentence_id = p_sentence_id;
end;
$$;

revoke all on function public.set_sentence_marked_hard(text, boolean) from public;
grant execute on function public.set_sentence_marked_hard(text, boolean) to authenticated;

-- Views created by the old schema must obey the profile table's RLS.
do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'leaderboard') then
    execute 'alter view public.leaderboard set (security_invoker = true)';
  end if;
end $$;

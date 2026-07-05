-- English Reflex Pro — initial production schema
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner',
  avatar_url text,
  level int not null default 1 check (level > 0),
  total_exp int not null default 0 check (total_exp >= 0),
  streak int not null default 0 check (streak >= 0),
  daily_goal_minutes int not null default 10,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  last_study_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  level text,
  icon text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  required_exp int not null default 0,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(category_id, slug)
);

create table if not exists public.sentences (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  external_id text unique,
  english text not null,
  vietnamese text not null,
  ipa text default '',
  level text not null check (level in ('A1','A2','B1','B2','C1')),
  category_label text,
  part_of_speech text default '',
  grammar_note text default '',
  alternative_answers jsonb not null default '[]'::jsonb,
  word_bank jsonb not null default '[]'::jsonb,
  audio_url text default '',
  tags jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  completed_sentences int not null default 0,
  accuracy numeric(5,2) not null default 0,
  best_combo int not null default 0,
  earned_exp int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  mode text not null check (mode in ('typing','word-bank','listening','reverse','speaking')),
  answer text,
  is_correct boolean not null,
  response_ms int,
  ai_feedback jsonb,
  pronunciation_score numeric(5,2),
  next_review_at timestamptz,
  repetition_interval_days int not null default 1,
  marked_hard boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists attempts_review_idx on public.attempts(user_id, next_review_at);
create index if not exists attempts_sentence_idx on public.attempts(sentence_id, created_at desc);

create table if not exists public.audio_cache (
  cache_key text primary key,
  text text not null,
  voice text not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  icon text,
  exp_reward int not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id, achievement_id)
);

create or replace view public.leaderboard as
select id, display_name, avatar_url, level, total_exp, streak,
       dense_rank() over(order by total_exp desc) as rank
from public.profiles;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.lessons enable row level security;
alter table public.sentences enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.attempts enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Public courses are readable" on public.categories for select using (published = true);
create policy "Public lessons are readable" on public.lessons for select using (published = true);
create policy "Public sentences are readable" on public.sentences for select using (published = true);
create policy "Users can view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users manage own progress" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own attempts" on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Achievements are readable" on public.achievements for select using (true);
create policy "Users read own achievements" on public.user_achievements for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('sentence-audio', 'sentence-audio', true)
on conflict (id) do update set public = excluded.public;

create policy "Public sentence audio" on storage.objects for select using (bucket_id = 'sentence-audio');

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

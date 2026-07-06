-- Create table user_lesson_progress
create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  current_sentence_index integer not null default 0,
  total_sentences integer not null default 10,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  exp_earned integer not null default 0,
  is_unlocked boolean not null default false,
  started_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- Create table user_learning_state
create table if not exists public.user_learning_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  current_course_id text not null,
  current_lesson_id text not null,
  current_sentence_index integer not null default 0,
  last_mode text not null default 'typing' check (last_mode in ('typing', 'word-bank', 'listening', 'reverse', 'speaking')),
  last_route text not null default 'home',
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_lesson_progress enable row level security;
alter table public.user_learning_state enable row level security;

-- Policies for user_lesson_progress
create policy "Users can view their own lesson progress"
  on public.user_lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lesson progress"
  on public.user_lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own lesson progress"
  on public.user_lesson_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for user_learning_state
create policy "Users can view their own learning state"
  on public.user_learning_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own learning state"
  on public.user_learning_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own learning state"
  on public.user_learning_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

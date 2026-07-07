-- Extend profiles table with new user profile metadata columns
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists country text default 'VN';
alter table public.profiles add column if not exists timezone text default 'Asia/Ho_Chi_Minh';
alter table public.profiles add column if not exists language text default 'vi';
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists last_login_at timestamptz default now();
alter table public.profiles add column if not exists membership_type text default 'free' check (membership_type in ('free', 'basic', 'pro', 'lifetime'));

-- Settings for Notification Toggles
alter table public.profiles add column if not exists notification_study_alerts boolean default true;
alter table public.profiles add column if not exists notification_email_reminders boolean default true;
alter table public.profiles add column if not exists notification_achievements boolean default true;
alter table public.profiles add column if not exists notification_promotions boolean default true;

-- Settings for Privacy Preferences
alter table public.profiles add column if not exists privacy_show_on_leaderboard boolean default true;
alter table public.profiles add column if not exists privacy_public_profile boolean default true;
alter table public.profiles add column if not exists privacy_show_streak boolean default true;
alter table public.profiles add column if not exists privacy_show_level boolean default true;

-- Sync profiles membership_type default value on existing memberships if any
update public.profiles p
set membership_type = coalesce((
  select plan::text
  from public.memberships m
  where m.user_id = p.id
  limit 1
), 'free')
where membership_type is null or membership_type = 'free';

-- Set up Supabase Storage Bucket 'avatars'
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up policies for Storage 'avatars' bucket
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload own avatar" on storage.objects;
create policy "Authenticated users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can update own avatar" on storage.objects;
create policy "Authenticated users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can delete own avatar" on storage.objects;
create policy "Authenticated users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

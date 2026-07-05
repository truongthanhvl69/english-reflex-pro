-- Migration: Add provider to profiles table and update trigger

-- 1. Add provider column to profiles table
alter table public.profiles add column if not exists provider text not null default 'email';

-- 2. Update trigger function handle_new_user to extract and store login provider
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_name text;
  resolved_avatar text;
  resolved_provider text;
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
  resolved_provider := coalesce(
    new.raw_app_meta_data ->> 'provider',
    new.app_metadata ->> 'provider',
    'email'
  );

  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (new.id, new.email, resolved_name, resolved_avatar, resolved_provider)
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name in ('', 'Learner')
        then excluded.full_name
      else public.profiles.full_name
    end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    provider = coalesce(public.profiles.provider, excluded.provider),
    updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Account profiles + daily digest subscription preferences.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  digest_enabled boolean not null default false,
  digest_hour_utc smallint not null default 7 check (digest_hour_utc between 0 and 23),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row automatically on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Record of digests sent, so a day is never emailed twice.
create table public.digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  digest_date date not null,
  status text not null default 'sent',
  detail text,
  created_at timestamptz not null default now(),
  unique (user_id, digest_date)
);

grant all on public.digest_deliveries to service_role;
alter table public.digest_deliveries enable row level security;

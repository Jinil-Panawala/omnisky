-- One curated digest per day, shared by all subscribers.
create table public.daily_digests (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,
  headline text not null,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

grant select on public.daily_digests to authenticated;
grant all on public.daily_digests to service_role;

alter table public.daily_digests enable row level security;

create policy "Signed-in users read digests"
  on public.daily_digests for select to authenticated
  using (true);
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null default 'agent' check (role in ('agent', 'manager')),
  team        text not null check (team in ('Alpha', 'Bravo', 'Charlie', 'Delta', 'Ops')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.requests (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  team        text not null,
  type        text not null check (type in ('overtime', 'equipment', 'schedule_swap', 'refund_approval', 'other')),
  title       text not null check (char_length(title) between 3 and 120),
  details     text check (char_length(details) <= 2000),
  amount      numeric(10, 2) check (amount is null or amount >= 0),
  needed_on   date,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by  uuid references public.profiles (id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index requests_created_at_idx on public.requests (created_at desc);
create index requests_status_idx     on public.requests (status);
create index requests_team_idx       on public.requests (team);
create index requests_created_by_idx on public.requests (created_by);

create table public.request_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  actor_id    uuid not null references public.profiles (id) on delete cascade,
  action      text not null check (action in ('created', 'approved', 'rejected', 'commented')),
  note        text check (char_length(note) <= 1000),
  created_at  timestamptz not null default now()
);

create index request_events_request_id_idx on public.request_events (request_id, created_at);
create index request_events_created_at_idx on public.request_events (created_at desc);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to authenticated;
grant select, insert, update on public.requests to authenticated;
grant select, insert on public.request_events to authenticated;
grant all on all tables in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'manager'
  );
$$;

grant execute on function public.is_manager() to authenticated;

create or replace function public.set_request_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select team into new.team from public.profiles where id = new.created_by;
  return new;
end;
$$;

create trigger requests_set_team
  before insert on public.requests
  for each row execute function public.set_request_team();

alter table public.profiles       enable row level security;
alter table public.requests       enable row level security;
alter table public.request_events enable row level security;

create policy "profiles readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "agents read own requests, managers read all"
  on public.requests for select
  to authenticated
  using (created_by = (select auth.uid()) or (select public.is_manager()));

create policy "users create requests as themselves, pending only"
  on public.requests for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
  );

create policy "managers update requests"
  on public.requests for update
  to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy "events readable when parent request is readable"
  on public.request_events for select
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_id
        and (r.created_by = (select auth.uid()) or (select public.is_manager()))
    )
  );

create policy "users write events as themselves on readable requests"
  on public.request_events for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and (
      action in ('created', 'commented')
      or (select public.is_manager())
    )
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and (r.created_by = (select auth.uid()) or (select public.is_manager()))
    )
  );

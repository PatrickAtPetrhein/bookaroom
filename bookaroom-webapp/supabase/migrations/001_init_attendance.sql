create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('in_office');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  company_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx on public.profiles (lower(email));
create index if not exists profiles_company_id_idx on public.profiles (company_id);

create table if not exists public.attendance_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null,
  office_date date not null,
  status public.attendance_status not null default 'in_office',
  created_at timestamptz not null default now(),
  unique (user_id, office_date)
);

create index if not exists attendance_days_company_date_idx
  on public.attendance_days (company_id, office_date);

create index if not exists attendance_days_user_date_idx
  on public.attendance_days (user_id, office_date);

create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.auth_company_id() from public;
grant execute on function public.auth_company_id() to authenticated;

alter table public.profiles enable row level security;
alter table public.attendance_days enable row level security;

drop policy if exists profiles_select_same_company on public.profiles;
create policy profiles_select_same_company
  on public.profiles
  for select
  to authenticated
  using (company_id = public.auth_company_id());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists attendance_select_same_company on public.attendance_days;
create policy attendance_select_same_company
  on public.attendance_days
  for select
  to authenticated
  using (company_id = public.auth_company_id());

drop policy if exists attendance_insert_self on public.attendance_days;
create policy attendance_insert_self
  on public.attendance_days
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and company_id = public.auth_company_id()
  );

drop policy if exists attendance_update_self on public.attendance_days;
create policy attendance_update_self
  on public.attendance_days
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and company_id = public.auth_company_id()
  );

drop policy if exists attendance_delete_self on public.attendance_days;
create policy attendance_delete_self
  on public.attendance_days
  for delete
  to authenticated
  using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.attendance_days to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance_days'
  ) then
    alter publication supabase_realtime add table public.attendance_days;
  end if;
end
$$;

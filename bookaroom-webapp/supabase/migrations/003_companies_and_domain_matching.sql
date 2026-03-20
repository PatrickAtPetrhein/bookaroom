-- 003: Companies table + email-domain-based multi-tenancy
--
-- Replaces the hardcoded DEFAULT_COMPANY_ID with automatic company
-- resolution based on the user's email domain.

-- 1. Create companies table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists companies_domain_unique_idx
  on public.companies (domain);

-- 2. RLS for companies: any authenticated user can read companies
alter table public.companies enable row level security;

drop policy if exists companies_select_authenticated on public.companies;
create policy companies_select_authenticated
  on public.companies
  for select
  to authenticated
  using (true);

-- 3. Security-definer function: find or create company by email domain.
--    Rejects personal email providers (gmail, outlook, etc.).
create or replace function public.ensure_company_for_domain(p_domain text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lower_domain text := lower(trim(p_domain));
  v_company_id uuid;
  v_blocked text[] := array[
    'gmail.com','googlemail.com',
    'outlook.com','hotmail.com','live.com',
    'yahoo.com','yahoo.co.uk',
    'aol.com',
    'icloud.com','me.com','mac.com',
    'protonmail.com','proton.me',
    'mail.com','zoho.com','yandex.com',
    'gmx.com','gmx.net','gmx.de',
    'web.de','t-online.de','freenet.de'
  ];
begin
  if v_lower_domain = any(v_blocked) then
    raise exception 'Personal email providers are not supported. Please use your work email.';
  end if;

  -- Try to find existing company
  select id into v_company_id
    from companies
   where domain = v_lower_domain;

  if v_company_id is not null then
    return v_company_id;
  end if;

  -- Create new company; ON CONFLICT handles race conditions
  insert into companies (name, domain)
  values (
    initcap(split_part(v_lower_domain, '.', 1)),
    v_lower_domain
  )
  on conflict (domain) do nothing;

  -- Re-select to get the id (covers both insert and conflict paths)
  select id into v_company_id
    from companies
   where domain = v_lower_domain;

  return v_company_id;
end;
$$;

revoke all on function public.ensure_company_for_domain(text) from public;
grant execute on function public.ensure_company_for_domain(text) to authenticated;

-- 4. Backfill: create companies for all existing email domains in profiles
insert into companies (name, domain)
select distinct
  initcap(split_part(lower(split_part(email, '@', 2)), '.', 1)),
  lower(split_part(email, '@', 2))
from public.profiles
where email like '%@%'
on conflict (domain) do nothing;

-- 5. Update existing profiles to point to the correct company
update public.profiles p
set company_id = c.id
from public.companies c
where lower(split_part(p.email, '@', 2)) = c.domain;

-- 6. Update existing attendance_days to match the profile's company
update public.attendance_days a
set company_id = p.company_id
from public.profiles p
where a.user_id = p.id
  and a.company_id <> p.company_id;

-- 7. Add foreign key from profiles to companies
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_company_id_fkey'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add constraint profiles_company_id_fkey
      foreign key (company_id) references public.companies(id);
  end if;
end
$$;

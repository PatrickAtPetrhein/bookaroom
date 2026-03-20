drop policy if exists profiles_select_same_company on public.profiles;

create policy profiles_select_same_company
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or company_id = public.auth_company_id()
  );

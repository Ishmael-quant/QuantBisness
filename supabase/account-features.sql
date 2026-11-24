create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  region text check (
    region is null or region in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western')
  ),
  country text not null,
  industry text not null check (industry in ('tech', 'agric', 'digital', 'education', 'stores', 'other')),
  description text not null default '',
  email text,
  phone text,
  website text check (website is null or website ~* '^https?://'),
  created_at timestamptz not null default now()
);

alter table public.supplier_contacts enable row level security;
drop policy if exists "Admins manage supplier contacts" on public.supplier_contacts;
create policy "Admins manage supplier contacts"
  on public.supplier_contacts for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.supplier_contacts from public, anon, authenticated;

create or replace function public.get_supplier_contacts(p_region text default null)
returns table (
  id uuid,
  name text,
  company text,
  region text,
  country text,
  industry text,
  description text,
  email text,
  phone text,
  website text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to view supplier contacts.';
  end if;

  if p_region is not null and p_region not in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western') then
    raise exception 'Invalid supplier region.';
  end if;

  return query
    select supplier.id, supplier.name, supplier.company, supplier.region, supplier.country,
      supplier.industry, supplier.description, supplier.email, supplier.phone, supplier.website
    from public.supplier_contacts as supplier
    where p_region is null or supplier.region = p_region
    order by supplier.region, supplier.country, supplier.company, supplier.name;
end;
$$;

revoke all on function public.get_supplier_contacts(text) from public, anon, authenticated;
grant execute on function public.get_supplier_contacts(text) to authenticated;

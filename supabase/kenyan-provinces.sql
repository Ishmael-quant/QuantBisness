alter table public.business_ideas
  drop constraint if exists business_ideas_region_check;
update public.business_ideas
set region = null
where region is not null
  and region not in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western');
alter table public.business_ideas
  add constraint business_ideas_region_check
  check (region is null or region in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western'));

alter table public.supplier_contacts
  drop constraint if exists supplier_contacts_region_check;
update public.supplier_contacts
set region = null
where region is not null
  and region not in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western');
alter table public.supplier_contacts alter column region drop not null;
alter table public.supplier_contacts
  add constraint supplier_contacts_region_check
  check (region is null or region in ('central', 'coast', 'eastern', 'nairobi', 'north_eastern', 'nyanza', 'rift_valley', 'western'));


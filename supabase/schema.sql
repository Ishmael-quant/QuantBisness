create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.business_ideas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(description) between 10 and 2000),
  image_url text check (image_url is null or image_url ~* '^https?://'),
  details_url text check (details_url is null or details_url ~* '^https?://'),
  budget_tier text not null check (budget_tier in ('p500', 'p1000', 'p10000', 'p100000+')),
  industry text not null check (industry in ('tech', 'agric', 'digital', 'education', 'stores', 'other')),
  region text check (
    region is null or region in ('local', 'western', 'northern', 'southern', 'middle')
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.idea_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  idea_id uuid not null references public.business_ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);

create index if not exists business_ideas_public_listing_idx
  on public.business_ideas (status, created_at desc);
create index if not exists business_ideas_submitted_by_idx
  on public.business_ideas (submitted_by, created_at desc);
create index if not exists idea_favorites_idea_id_idx
  on public.idea_favorites (idea_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_ideas_set_updated_at on public.business_ideas;
create trigger business_ideas_set_updated_at
  before update on public.business_ideas
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.business_ideas enable row level security;
alter table public.idea_favorites enable row level security;

drop policy if exists "Users can view their own admin role" on public.admin_users;
create policy "Users can view their own admin role"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Approved ideas and own submissions are visible" on public.business_ideas;
create policy "Approved ideas and own submissions are visible"
  on public.business_ideas for select to anon, authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "Signed-in users can submit pending ideas" on public.business_ideas;
create policy "Signed-in users can submit pending ideas"
  on public.business_ideas for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists "Admins can create ideas" on public.business_ideas;
create policy "Admins can create ideas"
  on public.business_ideas for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update ideas" on public.business_ideas;
create policy "Admins can update ideas"
  on public.business_ideas for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete ideas" on public.business_ideas;
create policy "Admins can delete ideas"
  on public.business_ideas for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Users can view their own favorites" on public.idea_favorites;
create policy "Users can view their own favorites"
  on public.idea_favorites for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can favorite approved ideas" on public.idea_favorites;
create policy "Users can favorite approved ideas"
  on public.idea_favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.business_ideas
      where id = idea_id and status = 'approved'
    )
  );

drop policy if exists "Users can remove their own favorites" on public.idea_favorites;
create policy "Users can remove their own favorites"
  on public.idea_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

grant execute on function public.is_admin() to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.business_ideas to anon, authenticated;
grant insert, update, delete on public.business_ideas to authenticated;
grant select on public.idea_favorites to authenticated;
grant insert, delete on public.idea_favorites to authenticated;
grant select on public.admin_users to authenticated;

insert into public.business_ideas (name, slug, description, budget_tier, industry, region, status)
values
  ('Electronic Device Repairs', 'electronic-device-repairs',
   'Start a repair shop for phones, laptops, and gadgets with low capital and a steady stream of daily customers.',
   'p1000', 'tech', 'local', 'approved'),
  ('E-Commerce', 'e-commerce',
   'Tap into Africa''s booming online market, driven by growing populations, urbanisation, and technology adoption.',
   'p1000', 'stores', null, 'approved'),
  ('Freelancing', 'freelancing',
   'Earn by providing graphic design, software development, writing, or virtual assistance to a global clientele.',
   'p500', 'tech', null, 'approved'),
  ('Cassava Processing', 'cassava-processing',
   'Process cassava into flour, starch, or bioethanol and build value-added food products for local markets.',
   'p1000', 'agric', null, 'approved'),
  ('Waste-to-Energy Plant', 'waste-to-energy-plant',
   'Explore renewable energy and green technology through solar power, biogas, and eco-friendly manufacturing.',
   'p100000+', 'tech', null, 'approved'),
  ('Real Estate & Property Tech', 'real-estate-property-tech',
   'Meet the demand for affordable housing, property services, and short-term rentals in growing economic hubs.',
   'p100000+', 'other', null, 'approved'),
  ('Technology & Software Development', 'technology-software-development',
   'Build software that solves local challenges in Africa''s growing technology hubs and markets.',
   'p10000', 'tech', null, 'approved'),
  ('Fashion & Beauty Industry', 'fashion-beauty-industry',
   'Build a local brand inspired by Africa''s young population, rising incomes, and distinctive styles.',
   'p1000', 'stores', null, 'approved'),
  ('Tourism', 'tourism',
   'Share Africa''s heritage, landscapes, and historic sites through eco-tourism, cultural tours, and adventure travel.',
   'p100000+', 'other', null, 'approved')
on conflict (slug) do nothing;

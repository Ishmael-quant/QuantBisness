alter table public.business_ideas
  add column if not exists details text,
  add column if not exists image_credit text check (image_credit is null or char_length(image_credit) <= 500),
  add column if not exists image_credit_url text check (image_credit_url is null or image_credit_url ~* '^https?://'),
  add column if not exists image_license text check (image_license is null or char_length(image_license) <= 100),
  add column if not exists image_license_url text check (image_license_url is null or image_license_url ~* '^https?://');

alter table public.business_ideas
  drop constraint if exists business_ideas_details_check;
alter table public.business_ideas
  add constraint business_ideas_details_check
  check (details is null or char_length(details) <= 10000);

drop policy if exists "Signed-in users can submit pending ideas" on public.business_ideas;
drop policy if exists "Approved ideas and own submissions are visible" on public.business_ideas;
drop policy if exists "Approved ideas are visible" on public.business_ideas;
create policy "Approved ideas are visible"
  on public.business_ideas for select to anon, authenticated
  using (
    status = 'approved'
    or (select public.is_admin())
  );

revoke select on public.business_ideas from public, anon;
grant select (id, name, slug, description, image_url, image_credit, image_credit_url, image_license, image_license_url, budget_tier, industry, region, status, created_at)
  on public.business_ideas to anon;
grant select on public.business_ideas to authenticated;

do $$
begin
  if to_regclass('public.marketplace_items') is not null then
    execute 'drop policy if exists "Admins manage marketplace items" on public.marketplace_items';
    execute 'drop policy if exists "Members can submit marketplace resources for review" on public.marketplace_items';
    execute 'drop policy if exists "Members can view approved resources and own submissions" on public.marketplace_items';
    execute 'revoke all on table public.marketplace_items from public, anon, authenticated';
  end if;

  if to_regclass('public.market_search_activity') is not null then
    execute 'revoke all on table public.market_search_activity from public, anon, authenticated';
  end if;

  if to_regprocedure('public.get_marketplace_items()') is not null then
    execute 'revoke all on function public.get_marketplace_items() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.record_market_search(text,text)') is not null then
    execute 'revoke all on function public.record_market_search(text,text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_market_search_insights()') is not null then
    execute 'revoke all on function public.get_market_search_insights() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_detailed_market_search_insights()') is not null then
    execute 'revoke all on function public.get_detailed_market_search_insights() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.delete_my_market_search_activity()') is not null then
    execute 'revoke all on function public.delete_my_market_search_activity() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.is_premium_member()') is not null then
    execute 'revoke all on function public.is_premium_member() from public, anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';

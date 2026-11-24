alter table public.business_ideas
  drop constraint if exists business_ideas_budget_tier_check;

update public.business_ideas
set budget_tier = case budget_tier
  when 'p500' then 'p1000'
  when 'p1000' then 'p1000'
  when 'p10000' then 'p50000'
  when 'p100000' then 'p500000'
  when 'p100000+' then 'p500000'
end
where budget_tier in ('p500', 'p1000', 'p10000', 'p100000', 'p100000+');

alter table public.business_ideas
  add constraint business_ideas_budget_tier_check
  check (budget_tier in ('p1000', 'p50000', 'p100000', 'p500000', 'p1000000', 'p1000000+'));

# QuantBisness

QuantBisness helps people explore business ideas and, with an account, access practical setup guidance.

## Pages and features

<<<<<<< HEAD
- [Home](./index.html) introduces QuantBisness.
- [Explore business ideas](./ideas.html) provides public listings and filters for budget, industry, and region. Anyone can browse.
- Opening an idea shows its public description and budget context. Signed-in users can view the five-step setup guide and any additional guidance published by an administrator.
- The [account workspace](./account.html) contains Overview, Supplier contacts, Saved ideas, and a Marketplace placeholder marked as coming soon. Market insights are also marked as coming soon.
- Only administrators publish business ideas through [Admin](./admin.html). Members cannot submit ideas.
- Signed-in members can browse the supplier directory.
- The Kenyan business idea seed in [`supabase/kenyan-business-ideas.sql`](./supabase/kenyan-business-ideas.sql) contains 60 ideas. E-commerce and physical retail share the E-commerce & Retail category. Budget tiers are broad planning estimates, not researched quotations; verify local costs before investing.
- Where image attribution is available, idea images show the creator and license.
- Region fields and filters use Kenya's eight former provinces: Central, Coast, Eastern, Nairobi, North Eastern, Nyanza, Rift Valley, and Western.
- `robots.txt` and `sitemap.xml` provide crawler guidance and the public-page sitemap for the GitHub Pages site.

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql), then [`supabase/account-features.sql`](./supabase/account-features.sql) to add the supplier directory. On an existing installation, run [`supabase/budget-tiers.sql`](./supabase/budget-tiers.sql) and [`supabase/kenyan-provinces.sql`](./supabase/kenyan-provinces.sql), if needed, **before** running the seeds in step 3. The budget migration updates legacy tier values and replaces the old constraint so tiers such as `p500000` are accepted.
3. Run [`supabase/kenyan-business-ideas.sql`](./supabase/kenyan-business-ideas.sql) and [`supabase/kenyan-supplier-directory.sql`](./supabase/kenyan-supplier-directory.sql). Then run [`supabase/member-access-simplification.sql`](./supabase/member-access-simplification.sql) to add any missing setup-details and image-attribution columns, restrict anonymous idea queries to public listing fields, and disable access to legacy marketplace and insight endpoints. Run [`supabase/kenyan-business-idea-images.sql`](./supabase/kenyan-business-idea-images.sql) after the idea seed to populate the 60 ideas with their image URLs and attributions. Finally, run [`supabase/idea-setup-guides.sql`](./supabase/idea-setup-guides.sql) to add the tailored setup guides; it preserves existing admin notes and can be rerun safely. On an existing project, run the updated [`supabase/account-features.sql`](./supabase/account-features.sql) first, then `member-access-simplification.sql`, `kenyan-business-idea-images.sql`, and `idea-setup-guides.sql` in the Supabase SQL Editor.
4. Enable email/password authentication. Copy the project URL and anon/public key from Supabase into `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase-config.js`. The anon key is intended for browser use; never put a service-role key in the site.
5. Create an account on `account.html`, then grant it admin access in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'your-admin-email@example.com'
   on conflict (user_id) do nothing;
   ```

6. Review supplier contact details before publishing and keep them current. Admins can add further contacts through the SQL Editor and manage business ideas through `admin.html`.
7. Set the Supabase Auth site URL to your local or deployed site, serve the site over localhost or HTTPS, and open `ideas.html`. Search text and filter activity are not recorded.

The removed marketplace and market-insight SQL files are no longer part of setup. The cleanup migration revokes access to their legacy database objects but leaves existing rows in place.
=======
#How you can help                                                         
1-You can send business ideas and how to set them up.                                                  
2-any other that you feel can help
3-advice and recommendations

## Pages
- [Home](https://ishmael-quant.github.io/QuantBisness/index.html)) introduces QuantBisness and links to business sectors.
- [Explore business ideas](https://ishmael-quant.github.io/QuantBisness/ideas.html)) provides searchable listings and budget, industry, and region filters.
>>>>>>> 316d66d17fb721d661b125305627818f635a6ba0

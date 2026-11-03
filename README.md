# QuantBisness

#About                                    
This is a website i'm creating to improve the economy of African states/countries.
It is build to give people business ideas that will work in Africa.
It is currently just an idea listing website but in the next 6 months,it will be a website that list business ideas,shows how to setup the businesses,add a business idea that will work from succesful business persons and maybe a place where Africans in Diaspora can invest in African businesses

#Approach                                    
I first buld the most basic one-the business idea listing page,then the process of setting up the business,then a place to add an idea then funding from African Diaspora

#How you can help                                                         
1-You can send business ideas and how to set them up.                                                  
2-any other that you feel can help
3-advice and recommendations

## Pages
- [Home](./index.html) introduces QuantBisness and links to business sectors.
- [Explore business ideas](./ideas.html) provides searchable listings and budget, industry, and region filters.

## Supabase setup
1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) to create the listing, favorites, admin-role tables, row-level security policies, and starter ideas.
3. Enable email/password authentication. Copy the project URL and anon/public key from Supabase into `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `supabase-config.js`. The anon key is intended for browser use; never put a service-role key in the site.
4. Create an account on `account.html`, then grant that account admin access in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'your-admin-email@example.com'
   on conflict (user_id) do nothing;
   ```

5. Set the Supabase Auth site URL to your local or deployed site, then serve the site over localhost or HTTPS and open `ideas.html`. Users can sign in to save favorites or submit ideas for approval; admins manage listings at `admin.html`.

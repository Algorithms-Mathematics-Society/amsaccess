-- ============================================================
-- Migration: Admin user setup
--
-- HOW TO CREATE AN ADMIN:
-- Run this in the Supabase Dashboard → SQL Editor, OR
-- use the Supabase CLI: supabase db push
--
-- IMPORTANT: Replace the email/password below before running.
-- The password is hashed by Supabase automatically — you are
-- NOT storing it in plaintext.
--
-- After creating the user here, you can also create them via:
-- Dashboard → Authentication → Users → Add User
-- Then set their role via the SQL below.
-- ============================================================

-- Step 1: Create the admin user in Supabase Auth
-- (Skip this if you create the user via the Dashboard UI instead)
--
-- Replace 'admin@yourdomain.com' and 'YourSecurePassword123!' below:
--
-- select auth.create_user(
--   '{"email": "admin@yourdomain.com", "password": "YourSecurePassword123!", "email_confirm": true}'::jsonb
-- );


-- Step 2: Set the admin role in user_metadata
-- Run this AFTER the user is created (get their UUID from auth.users):
--
-- update auth.users
-- set raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- where email = 'admin@yourdomain.com';


-- Step 3: Verify the role was set correctly:
-- select id, email, raw_user_meta_data->>'role' as role from auth.users;


-- ── RLS policies for admin (authenticated + role=admin) ─────
-- These allow the admin dashboard to read all sessions, events, answers, reviews.
-- Authenticated users who are admins bypass standard anon restrictions.

-- Allow admin to read ALL sessions (not just their own)
create policy "admin read all sessions"
  on sessions for select
  to authenticated
  using (auth.jwt() ->> 'role' = 'admin' or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Allow admin to read ALL answers
create policy "admin read all answers"
  on answers for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Allow admin to read ALL proctor events
create policy "admin read all proctor events"
  on proctor_events for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Allow admin to read and write reviews
create policy "admin manage reviews"
  on reviews for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Allow admin to read assessments and questions (they already have anon read,
-- but explicit authenticated policy ensures no gap if anon is removed later)
create policy "admin read assessments"
  on assessments for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

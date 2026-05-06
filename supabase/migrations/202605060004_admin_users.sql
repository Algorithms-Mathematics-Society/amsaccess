-- ============================================================
-- Migration: Admin authorization table
--
-- Candidates DO NOT use Supabase Auth. They remain anonymous users
-- tied to assessment sessions.
--
-- Admins DO use Supabase Auth. An auth user becomes an admin only
-- when their user id is listed in public.admin_users.
--
-- HOW TO CREATE AN ADMIN
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user
-- 2. Run this with that user's email:
--
-- insert into public.admin_users (user_id, email)
-- select id, email
-- from auth.users
-- where email = 'admin@yourdomain.com'
-- on conflict (user_id) do update
-- set email = excluded.email,
--     is_active = true;
--
-- To revoke access:
--
-- update public.admin_users
-- set is_active = false
-- where email = 'admin@yourdomain.com';
-- ============================================================

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin users read own active record" on public.admin_users;
create policy "admin users read own active record"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid() and is_active = true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active = true
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Supersede the earlier metadata-based admin policies.

drop policy if exists "admin read all sessions" on sessions;
create policy "admin read all sessions"
  on sessions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin read all answers" on answers;
create policy "admin read all answers"
  on answers for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin read all proctor events" on proctor_events;
create policy "admin read all proctor events"
  on proctor_events for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin manage reviews" on reviews;
create policy "admin manage reviews"
  on reviews for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin read assessments" on assessments;
create policy "admin read assessments"
  on assessments for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin read questions" on questions;
create policy "admin read questions"
  on questions for select
  to authenticated
  using (public.is_admin());

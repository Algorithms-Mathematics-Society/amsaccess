-- ============================================================
-- Migration: Organizations, Contests, and Invites
--
-- Adds multi-org support so organizations can:
--   1. Create and manage contests
--   2. Add HTML/CSS/JS coding questions
--   3. Invite candidates by email
--
-- Candidate invite lookup exposed via anon-accessible RPC.
-- ============================================================

-- ── Organizations ───────────────────────────────────────────
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- ── Org members ─────────────────────────────────────────────
create table if not exists public.org_members (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'admin' check (role in ('owner', 'admin')),
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.org_members enable row level security;

-- ── Contests ────────────────────────────────────────────────
create table if not exists public.contests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  title       text not null,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  status      text not null default 'DRAFT'
              check (status in ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED')),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at > start_at)
);

alter table public.contests enable row level security;

create index if not exists contests_org_status_idx on public.contests (org_id, status);

-- ── Contest questions (HTML / CSS / JS coding) ──────────────
create table if not exists public.contest_questions (
  id          uuid primary key default gen_random_uuid(),
  contest_id  uuid not null references public.contests(id) on delete cascade,
  title       text not null,
  description text not null default '',
  html_starter text not null default '',
  css_starter  text not null default '',
  js_starter   text not null default '',
  points      int not null default 10 check (points > 0),
  order_index int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.contest_questions enable row level security;

create index if not exists contest_questions_contest_order_idx
  on public.contest_questions (contest_id, order_index);

-- ── Contest invites (by email) ───────────────────────────────
create table if not exists public.contest_invites (
  id          uuid primary key default gen_random_uuid(),
  contest_id  uuid not null references public.contests(id) on delete cascade,
  email       text not null,
  invited_by  uuid not null references auth.users(id),
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  unique (contest_id, email)
);

alter table public.contest_invites enable row level security;

create index if not exists contest_invites_email_idx on public.contest_invites (lower(email));
create index if not exists contest_invites_contest_idx on public.contest_invites (contest_id);

-- ── Helper functions ────────────────────────────────────────
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;
grant execute on function public.is_org_member(uuid) to authenticated;

create or replace function public.is_contest_org_member(p_contest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members om
    join public.contests c on c.org_id = om.org_id
    where c.id = p_contest_id and om.user_id = auth.uid()
  );
$$;
grant execute on function public.is_contest_org_member(uuid) to authenticated;

-- ── RLS: organizations ──────────────────────────────────────
create policy "org members can read their orgs"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id) or owner_id = auth.uid());

create policy "authenticated users can create orgs"
  on public.organizations for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "org owners can update their org"
  on public.organizations for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "org owners can delete their org"
  on public.organizations for delete
  to authenticated
  using (owner_id = auth.uid());

-- ── RLS: org_members ────────────────────────────────────────
create policy "org members can read membership"
  on public.org_members for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "org owners can manage members"
  on public.org_members for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = org_id and o.owner_id = auth.uid()
    )
  );

-- ── RLS: contests ────────────────────────────────────────────
create policy "org members can read their contests"
  on public.contests for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "org members can manage contests"
  on public.contests for insert
  to authenticated
  with check (public.is_org_member(org_id));

create policy "org members can update contests"
  on public.contests for update
  to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "org members can delete contests"
  on public.contests for delete
  to authenticated
  using (public.is_org_member(org_id));

-- ── RLS: contest_questions ───────────────────────────────────
create policy "org members can manage contest questions"
  on public.contest_questions for all
  to authenticated
  using (public.is_contest_org_member(contest_id))
  with check (public.is_contest_org_member(contest_id));

-- ── RLS: contest_invites ─────────────────────────────────────
create policy "org members can manage invites"
  on public.contest_invites for all
  to authenticated
  using (public.is_contest_org_member(contest_id))
  with check (public.is_contest_org_member(contest_id));

-- ── Anon RPC: get invited contests by email ──────────────────
-- Called by the Tauri desktop app (no Supabase auth session).
-- Returns non-ended contests where the given email was invited.
create or replace function public.get_invited_contests(p_email text)
returns table (
  id          uuid,
  title       text,
  description text,
  start_at    timestamptz,
  end_at      timestamptz,
  status      text,
  org_name    text,
  org_slug    text,
  question_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.title,
    c.description,
    c.start_at,
    c.end_at,
    c.status,
    o.name  as org_name,
    o.slug  as org_slug,
    (select count(*) from public.contest_questions cq where cq.contest_id = c.id) as question_count
  from public.contest_invites ci
  join public.contests c  on c.id  = ci.contest_id
  join public.organizations o on o.id = c.org_id
  where lower(ci.email) = lower(p_email)
    and c.status <> 'ENDED'
  order by c.start_at asc;
$$;
grant execute on function public.get_invited_contests(text) to anon, authenticated;

-- ── Trigger: auto-insert owner as org_member on org create ───
create or replace function public.org_owner_auto_member()
returns trigger
language plpgsql
as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists org_owner_auto_member_trigger on public.organizations;
create trigger org_owner_auto_member_trigger
  after insert on public.organizations
  for each row execute function public.org_owner_auto_member();

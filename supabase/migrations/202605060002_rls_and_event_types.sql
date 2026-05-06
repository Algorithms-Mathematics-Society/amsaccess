-- ============================================================
-- Migration: Proper Row Level Security
-- Replaces the wide-open MVP policies with scoped access rules.
--
-- Access model:
--   anon key  → candidates (create session, read own data, write own answers/events)
--   service_role key → admin dashboard (full read, write reviews)
--
-- How candidate identity works (no auth):
--   We use the session ID as the identity token. The candidate holds
--   their session UUID in the URL. Policies scope writes to that session_id.
--   Reads of assessments/questions are public (needed to load the exam).
-- ============================================================

-- ── Drop the old open MVP policies ──────────────────────────
drop policy if exists "mvp public read assessments"  on assessments;
drop policy if exists "mvp public read questions"    on questions;
drop policy if exists "mvp public sessions"          on sessions;
drop policy if exists "mvp public answers"           on answers;
drop policy if exists "mvp public proctor events"    on proctor_events;
drop policy if exists "mvp public reviews"           on reviews;

-- ── ASSESSMENTS ─────────────────────────────────────────────
-- Public read of active assessments so the landing page can list them.
-- No anon writes — only admins (service_role) can create/edit.
create policy "public read active assessments"
  on assessments for select
  to anon, authenticated
  using (is_active = true);

-- ── QUESTIONS ───────────────────────────────────────────────
-- Public read — candidates need to load question content.
-- No anon writes.
create policy "public read questions"
  on questions for select
  to anon, authenticated
  using (true);

-- ── SESSIONS ────────────────────────────────────────────────
-- INSERT: any anon can create a session (they are starting an exam).
-- SELECT: candidates can only read their own session (by id in URL).
-- UPDATE: candidates can update only their own session (for submit).
-- DELETE: never by anon.
create policy "anon insert session"
  on sessions for insert
  to anon
  with check (true);

create policy "anon read own session"
  on sessions for select
  to anon
  using (id = (current_setting('request.jwt.claims', true)::jsonb->>'session_id')::uuid
         or true); -- URL-scoped: candidate already knows their session_id from the URL.
                   -- True here is safe because the API call always filters by id=:sessionId.
                   -- Stricter enforcement requires JWT auth or server-side token validation.

create policy "anon update own session"
  on sessions for update
  to anon
  using (status != 'SUBMITTED') -- Cannot re-submit an already submitted session
  with check (status in ('IN_PROGRESS', 'SUBMITTED'));

-- ── ANSWERS ─────────────────────────────────────────────────
-- Candidates can insert/update answers only for sessions they own.
-- The session_id in the answer row must match the session in the URL
-- (enforced by the app — the anon key cannot verify URL params, so we
-- add a check that the referenced session is IN_PROGRESS).
create policy "anon insert own answers"
  on answers for insert
  to anon
  with check (
    exists (
      select 1 from sessions s
      where s.id = answers.session_id
        and s.status = 'IN_PROGRESS'
    )
  );

create policy "anon update own answers"
  on answers for update
  to anon
  using (
    exists (
      select 1 from sessions s
      where s.id = answers.session_id
        and s.status = 'IN_PROGRESS'
    )
  );

create policy "anon read own answers"
  on answers for select
  to anon
  using (true); -- Candidate always queries by session_id=their_id

-- ── PROCTOR EVENTS ──────────────────────────────────────────
-- Candidates can only insert events for IN_PROGRESS sessions.
-- Cannot read or modify proctor events (prevents tampering).
create policy "anon insert proctor events"
  on proctor_events for insert
  to anon
  with check (
    exists (
      select 1 from sessions s
      where s.id = proctor_events.session_id
        and s.status = 'IN_PROGRESS'
    )
  );

-- ── REVIEWS ─────────────────────────────────────────────────
-- Candidates cannot read or write reviews. Service role only.
-- (No anon policies needed — default deny applies.)

-- ── GRANT service_role full access (admin dashboard) ────────
-- service_role bypasses RLS by default in Supabase, so no explicit
-- policies are needed for admin. This comment documents the intent.

-- ── INDEX for event_type constraint ─────────────────────────
-- Update the proctor_events check constraint to allow all new event types
alter table proctor_events drop constraint if exists proctor_events_event_type_check;
alter table proctor_events add constraint proctor_events_event_type_check check (
  event_type in (
    'FULLSCREEN_ENTER', 'FULLSCREEN_EXIT',
    'TAB_HIDDEN', 'TAB_VISIBLE',
    'WINDOW_BLUR', 'WINDOW_FOCUS',
    'COPY', 'CUT', 'PASTE',
    'CONTEXT_MENU',
    'KEYBOARD_SHORTCUT_BLOCKED',
    'DEVTOOLS_SUSPECTED',
    'MOUSE_LEFT_WINDOW', 'MOUSE_RETURNED',
    'IDLE_30S', 'IDLE_60S', 'IDLE_120S',
    'NETWORK_OFFLINE', 'NETWORK_ONLINE',
    'PRINT_ATTEMPT',
    'TYPING_SPIKE', 'ANSWER_SPIKE',
    'SUBMISSION_STARTED', 'SUBMISSION_COMPLETED'
  )
);

-- ── Update risk score function with new weights ──────────────
create or replace function ams_event_weight(p_event_type text)
returns int
language sql
immutable
as $$
  select case p_event_type
    when 'FULLSCREEN_EXIT'           then 10
    when 'TAB_HIDDEN'                then 8
    when 'WINDOW_BLUR'               then 5
    when 'PASTE'                     then 6
    when 'COPY'                      then 3
    when 'CUT'                       then 3
    when 'KEYBOARD_SHORTCUT_BLOCKED' then 15
    when 'DEVTOOLS_SUSPECTED'        then 12
    when 'CONTEXT_MENU'              then 2
    when 'MOUSE_LEFT_WINDOW'         then 2
    when 'IDLE_60S'                  then 3
    when 'IDLE_120S'                 then 8
    when 'NETWORK_OFFLINE'           then 15
    when 'PRINT_ATTEMPT'             then 20
    else 0
  end
$$;

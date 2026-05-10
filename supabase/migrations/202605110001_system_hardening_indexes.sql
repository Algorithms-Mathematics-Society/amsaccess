-- ============================================================
-- Migration: System hardening indexes
--
-- Supports paginated admin/org dashboards and bounded detail views.
-- These indexes are additive and safe to run on existing deployments.
-- ============================================================

do $$
begin
  if to_regclass('public.sessions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'started_at') then
    create index if not exists sessions_started_desc_idx
      on public.sessions (started_at desc);
  end if;

  if to_regclass('public.sessions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'status')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'started_at') then
    create index if not exists sessions_status_started_idx
      on public.sessions (status, started_at desc);
  end if;

  if to_regclass('public.sessions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sessions' and column_name = 'candidate_email') then
    create index if not exists sessions_candidate_email_lower_idx
      on public.sessions (lower(candidate_email));
  end if;

  if to_regclass('public.proctor_events') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'proctor_events' and column_name = 'session_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'proctor_events' and column_name = 'event_type')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'proctor_events' and column_name = 'created_at') then
    create index if not exists proctor_events_session_type_created_idx
      on public.proctor_events (session_id, event_type, created_at);
  end if;

  if to_regclass('public.questions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'status')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'updated_at') then
    create index if not exists questions_status_updated_idx
      on public.questions (status, updated_at desc);
  end if;

  if to_regclass('public.questions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'type')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'questions' and column_name = 'difficulty') then
    create index if not exists questions_type_difficulty_idx
      on public.questions (type, difficulty);
  end if;

  if to_regclass('public.assessments') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assessments' and column_name = 'status')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assessments' and column_name = 'archived_at')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'assessments' and column_name = 'updated_at') then
    create index if not exists assessments_status_archive_updated_idx
      on public.assessments (status, archived_at, updated_at desc);
  end if;

  if to_regclass('public.contests') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contests' and column_name = 'org_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contests' and column_name = 'created_at') then
    create index if not exists contests_org_created_idx
      on public.contests (org_id, created_at desc);
  end if;

  if to_regclass('public.contests') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contests' and column_name = 'org_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contests' and column_name = 'status')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contests' and column_name = 'created_at') then
    create index if not exists contests_org_status_created_idx
      on public.contests (org_id, status, created_at desc);
  end if;

  if to_regclass('public.contest_invites') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contest_invites' and column_name = 'contest_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contest_invites' and column_name = 'email') then
    create index if not exists contest_invites_contest_email_lower_idx
      on public.contest_invites (contest_id, lower(email));
  end if;

  if to_regclass('public.contest_questions') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contest_questions' and column_name = 'contest_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'contest_questions' and column_name = 'created_at') then
    create index if not exists contest_questions_contest_created_idx
      on public.contest_questions (contest_id, created_at);
  end if;

  if to_regclass('public.question_assets') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'question_assets' and column_name = 'question_id')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'question_assets' and column_name = 'created_at') then
    create index if not exists question_assets_question_created_idx
      on public.question_assets (question_id, created_at desc);
  end if;
end $$;

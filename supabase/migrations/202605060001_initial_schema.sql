create extension if not exists "pgcrypto";

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  is_active boolean not null default false
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  order_index int not null,
  title text not null,
  statement text not null,
  max_score int not null default 10 check (max_score >= 0),
  unique (assessment_id, order_index)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete restrict,
  candidate_name text not null,
  candidate_email text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
  risk_score int not null default 0 check (risk_score between 0 and 100),
  user_agent text
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer_text text,
  final_answer text,
  updated_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists proctor_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'FULLSCREEN_ENTER',
      'FULLSCREEN_EXIT',
      'TAB_HIDDEN',
      'TAB_VISIBLE',
      'WINDOW_BLUR',
      'WINDOW_FOCUS',
      'COPY',
      'PASTE',
      'CONTEXT_MENU',
      'DEVTOOLS_SUSPECTED',
      'SUBMISSION_STARTED',
      'SUBMISSION_COMPLETED'
    )
  ),
  created_at timestamptz not null default now(),
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  score numeric,
  comments text,
  decision text check (decision is null or decision in ('ADVANCE', 'HOLD', 'REJECT')),
  created_at timestamptz not null default now(),
  unique (session_id)
);

create index if not exists questions_assessment_order_idx on questions (assessment_id, order_index);
create index if not exists sessions_assessment_started_idx on sessions (assessment_id, started_at desc);
create index if not exists answers_session_idx on answers (session_id);
create index if not exists proctor_events_session_created_idx on proctor_events (session_id, created_at);

create or replace function ams_event_weight(p_event_type text)
returns int
language sql
immutable
as $$
  select case p_event_type
    when 'FULLSCREEN_EXIT' then 8
    when 'TAB_HIDDEN' then 6
    when 'WINDOW_BLUR' then 4
    when 'COPY' then 3
    when 'PASTE' then 5
    when 'CONTEXT_MENU' then 2
    when 'DEVTOOLS_SUSPECTED' then 10
    else 0
  end
$$;

create or replace function ams_update_session_risk_score()
returns trigger
language plpgsql
as $$
begin
  update sessions
  set risk_score = least(
    100,
    (
      select coalesce(sum(ams_event_weight(event_type)), 0)::int
      from proctor_events
      where session_id = new.session_id
    )
  )
  where id = new.session_id;

  return new;
end;
$$;

drop trigger if exists proctor_events_update_risk_score on proctor_events;
create trigger proctor_events_update_risk_score
after insert on proctor_events
for each row execute function ams_update_session_risk_score();

-- MVP policies: public anon access keeps the prototype simple for candidate and admin pages.
-- Add authenticated admin roles and stricter RLS before using this for a real hiring round.
alter table assessments enable row level security;
alter table questions enable row level security;
alter table sessions enable row level security;
alter table answers enable row level security;
alter table proctor_events enable row level security;
alter table reviews enable row level security;

create policy "mvp public read assessments" on assessments for select to anon, authenticated using (true);
create policy "mvp public read questions" on questions for select to anon, authenticated using (true);
create policy "mvp public sessions" on sessions for all to anon, authenticated using (true) with check (true);
create policy "mvp public answers" on answers for all to anon, authenticated using (true) with check (true);
create policy "mvp public proctor events" on proctor_events for all to anon, authenticated using (true) with check (true);
create policy "mvp public reviews" on reviews for all to anon, authenticated using (true) with check (true);

insert into assessments (id, title, starts_at, ends_at, duration_minutes, is_active)
values (
  '11111111-1111-4111-8111-111111111111',
  'AMS Derive Online Round',
  null,
  null,
  60,
  true
)
on conflict (id) do nothing;

insert into questions (assessment_id, order_index, title, statement, max_score)
values
(
  '11111111-1111-4111-8111-111111111111',
  1,
  'Reasoning Under Constraints',
  'A system receives tasks with different priorities and deadlines. Describe an approach to decide which task should be handled next. Include assumptions, edge cases, and how you would evaluate whether the approach is fair.',
  10
),
(
  '11111111-1111-4111-8111-111111111111',
  2,
  'Derive a Simple Metric',
  'You are given candidate activity logs containing timestamps and event types. Propose a simple risk score that can help reviewers prioritize sessions without automatically accusing anyone of misconduct.',
  10
),
(
  '11111111-1111-4111-8111-111111111111',
  3,
  'System Design Writeup',
  'Design a lightweight online written assessment platform. Focus on data model, autosave behavior, submission flow, and integrity logging. Explain the tradeoffs you would make for an MVP.',
  15
)
on conflict (assessment_id, order_index) do nothing;

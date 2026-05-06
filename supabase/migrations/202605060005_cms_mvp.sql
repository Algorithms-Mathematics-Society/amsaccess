-- ============================================================
-- Migration: CMS MVP
--
-- Add reusable question-bank CMS, assessment-question assignment,
-- question assets, rubric scores, and storage policies.
-- This is intentionally additive so existing candidate sessions keep working.
-- ============================================================

-- ── Assessment CMS fields ───────────────────────────────────
alter table assessments add column if not exists slug text;
alter table assessments add column if not exists description text;
alter table assessments add column if not exists status text not null default 'DRAFT';
alter table assessments add column if not exists instructions text;
alter table assessments add column if not exists rules text;
alter table assessments add column if not exists allowed_browsers text[] not null default '{}'::text[];
alter table assessments add column if not exists allowed_devices text[] not null default '{}'::text[];
alter table assessments add column if not exists archived_at timestamptz;
alter table assessments add column if not exists created_at timestamptz not null default now();
alter table assessments add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assessments_status_check'
  ) then
    alter table assessments add constraint assessments_status_check
      check (status in ('DRAFT', 'SCHEDULED', 'LIVE', 'CLOSED'));
  end if;
end $$;

update assessments
set
  slug = coalesce(slug, 'ams-derive-online-round'),
  status = case
    when status is null or status = 'DRAFT' then 'LIVE'
    else status
  end,
  description = coalesce(description, 'AMS Derive written reasoning round'),
  instructions = coalesce(instructions, 'Write clear reasoning, state assumptions, and submit before the timer ends.'),
  rules = coalesce(rules, 'Stay in fullscreen. Do not switch tabs. Integrity events are review signals.'),
  updated_at = now()
where id = '11111111-1111-4111-8111-111111111111';

update assessments
set status = 'LIVE',
    updated_at = now()
where is_active = true
  and archived_at is null
  and status = 'DRAFT';

create unique index if not exists assessments_slug_unique_idx
  on assessments (slug)
  where slug is not null;

-- ── Reusable question-bank fields ───────────────────────────
alter table questions add column if not exists short_code text;
alter table questions add column if not exists type text not null default 'WRITTEN_REASONING';
alter table questions add column if not exists difficulty text not null default 'MEDIUM';
alter table questions add column if not exists tags text[] not null default '{}'::text[];
alter table questions add column if not exists expected_output text;
alter table questions add column if not exists rubric jsonb not null default '[]'::jsonb;
alter table questions add column if not exists assets jsonb not null default '[]'::jsonb;
alter table questions add column if not exists status text not null default 'DRAFT';
alter table questions add column if not exists requires_final_answer boolean not null default true;
alter table questions add column if not exists requires_explanation boolean not null default true;
alter table questions add column if not exists allows_diagrams boolean not null default false;
alter table questions add column if not exists allows_code boolean not null default false;
alter table questions add column if not exists allows_assumptions boolean not null default true;
alter table questions add column if not exists allows_multiple_methods boolean not null default true;
alter table questions add column if not exists version int not null default 1;
alter table questions add column if not exists change_notes text;
alter table questions add column if not exists created_at timestamptz not null default now();
alter table questions add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'questions_status_check'
  ) then
    alter table questions add constraint questions_status_check
      check (status in ('DRAFT', 'PUBLISHED'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'questions_type_check'
  ) then
    alter table questions add constraint questions_type_check
      check (type in (
        'WRITTEN_REASONING',
        'MATH_DERIVATION',
        'PROBABILITY_PUZZLE',
        'ESTIMATION_FERMI',
        'SYSTEM_DESIGN',
        'CASE_STUDY',
        'CODE_PSEUDOCODE_EXPLANATION',
        'DATA_INTERPRETATION'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'questions_difficulty_check'
  ) then
    alter table questions add constraint questions_difficulty_check
      check (difficulty in ('EASY', 'MEDIUM', 'HARD'));
  end if;
end $$;

update questions
set
  short_code = coalesce(short_code, 'Q' || lpad(order_index::text, 3, '0')),
  status = case when status = 'DRAFT' then 'PUBLISHED' else status end,
  expected_output = coalesce(expected_output, 'Written explanation with assumptions, reasoning, edge cases, and a concise final answer when appropriate.'),
  rubric = case
    when rubric = '[]'::jsonb then
      jsonb_build_array(
        jsonb_build_object('label', 'Correct reasoning', 'marks', greatest(max_score - 4, 1), 'description', 'Reasoning is valid and complete.'),
        jsonb_build_object('label', 'Assumptions and edge cases', 'marks', 2, 'description', 'Important assumptions and edge cases are stated.'),
        jsonb_build_object('label', 'Clarity', 'marks', 2, 'description', 'Explanation is clear and reviewable.')
      )
    else rubric
  end,
  updated_at = now()
where short_code is null or status = 'DRAFT' or expected_output is null or rubric = '[]'::jsonb;

create unique index if not exists questions_short_code_unique_idx
  on questions (short_code)
  where short_code is not null;

-- ── Reusable assignment table ───────────────────────────────
create table if not exists assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  order_index int not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, question_id),
  unique (assessment_id, order_index)
);

insert into assessment_questions (assessment_id, question_id, order_index)
select q.assessment_id, q.id, q.order_index
from questions q
where q.assessment_id is not null
on conflict (assessment_id, question_id) do update
set order_index = excluded.order_index;

alter table questions alter column assessment_id drop not null;

create index if not exists assessment_questions_assessment_order_idx
  on assessment_questions (assessment_id, order_index);

-- ── Question assets and review rubric scores ────────────────
create table if not exists question_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  caption text,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists question_assets_question_idx on question_assets (question_id);

alter table reviews add column if not exists rubric_scores jsonb not null default '{}'::jsonb;

-- ── Storage bucket ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('question-assets', 'question-assets', true)
on conflict (id) do update set public = true;

-- ── RLS ─────────────────────────────────────────────────────
alter table assessment_questions enable row level security;
alter table question_assets enable row level security;

drop policy if exists "public read active assessments" on assessments;
create policy "public read active assessments"
  on assessments for select
  to anon, authenticated
  using (
    is_active = true
    and archived_at is null
    and status in ('LIVE', 'SCHEDULED')
  );

drop policy if exists "public read questions" on questions;

drop policy if exists "public read assigned assessment questions" on assessment_questions;
create policy "public read assigned assessment questions"
  on assessment_questions for select
  to anon, authenticated
  using (
    exists (
      select 1
      from assessments a
      where a.id = assessment_questions.assessment_id
        and a.archived_at is null
        and a.is_active = true
        and a.status in ('LIVE', 'SCHEDULED')
    )
  );

drop policy if exists "admin manage assessment questions" on assessment_questions;
create policy "admin manage assessment questions"
  on assessment_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin manage questions" on questions;
create policy "admin manage questions"
  on questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public read published assigned questions" on questions;
create policy "public read published assigned questions"
  on questions for select
  to anon, authenticated
  using (
    status = 'PUBLISHED'
    and exists (
      select 1
      from assessment_questions aq
      join assessments a on a.id = aq.assessment_id
      where aq.question_id = questions.id
        and a.archived_at is null
        and a.is_active = true
        and a.status in ('LIVE', 'SCHEDULED')
    )
  );

drop policy if exists "admin manage assessments" on assessments;
create policy "admin manage assessments"
  on assessments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public read question assets" on question_assets;
create policy "public read question assets"
  on question_assets for select
  to anon, authenticated
  using (
    exists (
      select 1
      from questions q
      where q.id = question_assets.question_id
        and q.status = 'PUBLISHED'
    )
  );

drop policy if exists "admin manage question assets" on question_assets;
create policy "admin manage question assets"
  on question_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public read question asset files" on storage.objects;
create policy "public read question asset files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'question-assets');

drop policy if exists "admin upload question asset files" on storage.objects;
create policy "admin upload question asset files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'question-assets' and public.is_admin());

drop policy if exists "admin update question asset files" on storage.objects;
create policy "admin update question asset files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'question-assets' and public.is_admin())
  with check (bucket_id = 'question-assets' and public.is_admin());

drop policy if exists "admin delete question asset files" on storage.objects;
create policy "admin delete question asset files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'question-assets' and public.is_admin());

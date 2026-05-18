-- ── CP contest fields ────────────────────────────────────────────────────────
-- Add IOI/ICPC/CF scoring type and allowed languages to contests.
-- Add CP-specific fields to contest_questions: question type, limits.

-- contests: scoring type + allowed languages
alter table public.contests
  add column if not exists scoring_type     text not null default 'ICPC'
    check (scoring_type in ('IOI', 'ICPC', 'CF')),
  add column if not exists allowed_languages text[] not null default array['C++17', 'Python3', 'Java17'];

-- contest_questions: question type + judge limits
alter table public.contest_questions
  add column if not exists question_type   text not null default 'code'
    check (question_type in ('code', 'output_only')),
  add column if not exists time_limit_ms   int  not null default 2000
    check (time_limit_ms >= 100),
  add column if not exists memory_limit_mb int  not null default 256
    check (memory_limit_mb >= 16);

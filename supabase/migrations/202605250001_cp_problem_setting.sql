-- CP Problem-Setting Infrastructure
-- Extends contest_questions with checker/validator/generator/statement fields.
-- Adds cp_problem_tests and cp_problem_subtasks tables.
-- Creates contest-testcases (private, per-org) and global-assets (shared) buckets.

-- ============================================================
-- Phase 1: Extend contest_questions with CP problem-setting fields
-- ============================================================

ALTER TABLE contest_questions
  ADD COLUMN checker_type       text        NOT NULL DEFAULT 'token'
                                CHECK (checker_type IN ('token', 'lines', 'real', 'custom')),
  ADD COLUMN checker_code       text,
  ADD COLUMN validator_code     text,
  ADD COLUMN generator_code     text,
  ADD COLUMN statement_md       text,
  ADD COLUMN editorial_md       text,
  ADD COLUMN model_solution     text,
  ADD COLUMN model_lang         text        NOT NULL DEFAULT 'cpp17'
                                CHECK (model_lang IN ('cpp17', 'cpp20', 'python3', 'java17')),
  ADD COLUMN statement_pdf_path text;

-- ============================================================
-- Phase 2: cp_problem_tests
-- ============================================================

CREATE TABLE cp_problem_tests (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id     uuid        NOT NULL REFERENCES contest_questions(id) ON DELETE CASCADE,
  contest_id     uuid        NOT NULL REFERENCES contests(id)          ON DELETE CASCADE,
  org_id         uuid        NOT NULL REFERENCES organizations(id)     ON DELETE CASCADE,
  test_number    int         NOT NULL CHECK (test_number > 0),
  is_sample      boolean     NOT NULL DEFAULT false,
  input_path     text        NOT NULL,
  output_path    text        NOT NULL,
  subtask_number int,
  score          int         NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, test_number)
);

ALTER TABLE cp_problem_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage their problem tests"
  ON cp_problem_tests FOR ALL
  TO authenticated
  USING    (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

CREATE INDEX cp_problem_tests_problem_idx        ON cp_problem_tests (problem_id);
CREATE INDEX cp_problem_tests_contest_idx        ON cp_problem_tests (contest_id);
CREATE INDEX cp_problem_tests_problem_sample_idx ON cp_problem_tests (problem_id, is_sample);
CREATE INDEX cp_problem_tests_problem_subtask_idx ON cp_problem_tests (problem_id, subtask_number);

-- ============================================================
-- Phase 3: cp_problem_subtasks
-- ============================================================

CREATE TABLE cp_problem_subtasks (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id             uuid        NOT NULL REFERENCES contest_questions(id) ON DELETE CASCADE,
  contest_id             uuid        NOT NULL REFERENCES contests(id)          ON DELETE CASCADE,
  org_id                 uuid        NOT NULL REFERENCES organizations(id)     ON DELETE CASCADE,
  subtask_number         int         NOT NULL CHECK (subtask_number > 0),
  score                  int         NOT NULL CHECK (score >= 0),
  constraint_description text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, subtask_number)
);

ALTER TABLE cp_problem_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage their problem subtasks"
  ON cp_problem_subtasks FOR ALL
  TO authenticated
  USING    (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

CREATE INDEX cp_problem_subtasks_problem_idx  ON cp_problem_subtasks (problem_id);
CREATE INDEX cp_problem_subtasks_contest_idx  ON cp_problem_subtasks (contest_id);

-- ============================================================
-- Phase 4: Storage buckets
-- ============================================================

-- Private bucket for per-org test case files.
-- Path: {org_id}/{contest_id}/{problem_id}/tests/{n}.in|out
--       {org_id}/{contest_id}/{problem_id}/checker.cpp
--       {org_id}/{contest_id}/{problem_id}/validator.cpp
--       {org_id}/{contest_id}/{problem_id}/generator.cpp
--       {org_id}/{contest_id}/{problem_id}/solution.cpp
--       {org_id}/{contest_id}/{problem_id}/statement.pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contest-testcases', 'contest-testcases', false, 52428800);

-- Private bucket for shared testlib/standard-checkers/templates.
-- Path: testlib/testlib.h
--       standard-checkers/ncmp.cpp  wcmp.cpp  ...
--       templates/checker_template.cpp  validator_template.cpp
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('global-assets', 'global-assets', false, 10485760);

-- ============================================================
-- Phase 5: Storage RLS — contest-testcases
-- First path segment must be the caller's org_id.
-- ============================================================

CREATE POLICY "org members read contest testcases"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contest-testcases'
    AND is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "org members write contest testcases"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contest-testcases'
    AND is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "org members update contest testcases"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contest-testcases'
    AND is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

CREATE POLICY "org members delete contest testcases"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contest-testcases'
    AND is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

-- ============================================================
-- Phase 6: Storage RLS — global-assets
-- Any authenticated org member can read; only AMS admin can write.
-- ============================================================

CREATE POLICY "org members read global assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'global-assets');

CREATE POLICY "admin write global assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'global-assets' AND is_admin());

CREATE POLICY "admin update global assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'global-assets' AND is_admin());

CREATE POLICY "admin delete global assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'global-assets' AND is_admin());

-- CP Problem Parts
-- Enables multi-part problems where Part N+1 unlocks after Part N is solved.
-- Each part has its own statement, answer key, and point value.

CREATE TABLE cp_problem_parts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id     uuid        NOT NULL REFERENCES contest_questions(id) ON DELETE CASCADE,
  contest_id     uuid        NOT NULL REFERENCES contests(id)          ON DELETE CASCADE,
  part_number    int         NOT NULL CHECK (part_number > 0),
  title          text        NOT NULL DEFAULT '',
  statement_md   text        NOT NULL DEFAULT '',
  answer_key     text,
  points         int         NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, part_number)
);

ALTER TABLE cp_problem_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage their problem parts"
  ON cp_problem_parts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN contests c ON c.org_id = om.org_id
      WHERE c.id = contest_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      JOIN contests c ON c.org_id = om.org_id
      WHERE c.id = contest_id AND om.user_id = auth.uid()
    )
  );

CREATE INDEX cp_problem_parts_problem_idx ON cp_problem_parts (problem_id);
CREATE INDEX cp_problem_parts_contest_idx ON cp_problem_parts (contest_id);
CREATE INDEX cp_problem_parts_problem_order_idx ON cp_problem_parts (problem_id, part_number);

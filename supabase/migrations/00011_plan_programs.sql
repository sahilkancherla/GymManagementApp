-- Pull memberships out of programs: a plan belongs to a gym and may apply
-- to zero, one, or multiple programs within that gym.
--
-- Before: plans.program_id NULLABLE FK to programs(id) — at most one program.
-- After:  plan_programs(plan_id, program_id) junction — many-to-many.

CREATE TABLE IF NOT EXISTS plan_programs (
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_programs_plan_id ON plan_programs(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_programs_program_id ON plan_programs(program_id);

-- Backfill any existing plan→program links.
INSERT INTO plan_programs (plan_id, program_id)
SELECT id, program_id
FROM plans
WHERE program_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the old single-program FK.
DROP INDEX IF EXISTS idx_plans_program_id;
ALTER TABLE plans DROP COLUMN IF EXISTS program_id;

ALTER TABLE plan_programs ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can see the plan's gym can see the link (handled by
-- plans/programs visibility — here we just allow read for authenticated users).
CREATE POLICY "plan_programs_select" ON plan_programs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Writes are performed by the service role on the server; no client writes.

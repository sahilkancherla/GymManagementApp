-- =====================================================================
-- class_plans: restrict class signups to specific membership plans.
--
-- Many-to-many between classes and plans.
--   * If a class has zero rows in class_plans, it's open to any active
--     gym member (no restriction).
--   * If a class has one or more rows, only users with an active
--     subscription whose plan_id is in that set may sign up.
-- =====================================================================

CREATE TABLE class_plans (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  plan_id  uuid NOT NULL REFERENCES plans(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, plan_id)
);

CREATE INDEX idx_class_plans_class_id ON class_plans(class_id);
CREATE INDEX idx_class_plans_plan_id  ON class_plans(plan_id);

ALTER TABLE class_plans ENABLE ROW LEVEL SECURITY;

-- Visible to all authenticated users; deletes/inserts go through the
-- service-role API which bypasses RLS, but admins/coaches reading via
-- the anon client should still be able to see the link rows.
CREATE POLICY "class_plans readable by authenticated"
  ON class_plans FOR SELECT
  TO authenticated USING (true);

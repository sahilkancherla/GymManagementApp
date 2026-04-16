-- =====================================================================
-- Per-program active/inactive status
--
-- A user can be enrolled in multiple programs at the same gym. Admins
-- need to be able to mark any individual enrollment as inactive without
-- deleting it (e.g. paused, on hold) — so we add a status column to
-- program_enrollments mirroring the gym_members.status convention.
-- =====================================================================

ALTER TABLE program_enrollments
  ADD COLUMN status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_id ON program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program_id ON program_enrollments(program_id);

-- Allow admins / co-members of the same gym to view enrollments (RLS).
-- Service role bypasses RLS, but adding the policy keeps direct client
-- reads coherent if we ever expose this table to the client SDK.
DROP POLICY IF EXISTS "Users can view own enrollments" ON program_enrollments;

CREATE POLICY "View own enrollments" ON program_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Co-gym members view enrollments" ON program_enrollments
  FOR SELECT TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.gym_id IN (
        SELECT gm.gym_id FROM gym_members gm WHERE gm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Enrollments updatable by authenticated" ON program_enrollments
  FOR UPDATE TO authenticated USING (true);

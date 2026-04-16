-- Allow announcements to be scoped to a specific program or membership plan
-- in addition to the existing gym-wide default. At most one of program_id or
-- plan_id may be set; both NULL means gym-wide.

ALTER TABLE announcements
  ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  ADD COLUMN plan_id uuid REFERENCES plans(id) ON DELETE CASCADE;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_single_target
  CHECK (program_id IS NULL OR plan_id IS NULL);

CREATE INDEX announcements_program_idx ON announcements (program_id) WHERE program_id IS NOT NULL;
CREATE INDEX announcements_plan_idx ON announcements (plan_id) WHERE plan_id IS NOT NULL;

-- Replace the SELECT policy so that targeted announcements are only visible
-- to members who actually belong to the targeted program/plan. Admins always
-- see everything. The Express server uses the service role key and bypasses
-- RLS — these policies are defensive for any direct client reads.
DROP POLICY IF EXISTS "Announcements viewable by gym members" ON announcements;

CREATE POLICY "Announcements viewable by targeted gym members" ON announcements
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM gym_members gm
      WHERE gm.gym_id = announcements.gym_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
    AND (
      -- Gym-wide
      (announcements.program_id IS NULL AND announcements.plan_id IS NULL)
      OR
      -- Admin override
      EXISTS (
        SELECT 1
        FROM gym_members gm2
        JOIN gym_member_roles gmr ON gmr.member_id = gm2.id
        WHERE gm2.gym_id = announcements.gym_id
          AND gm2.user_id = auth.uid()
          AND gmr.role = 'admin'
      )
      OR
      -- Targeted to a program the user is actively enrolled in
      (
        announcements.program_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM program_enrollments pe
          WHERE pe.program_id = announcements.program_id
            AND pe.user_id = auth.uid()
            AND pe.status = 'active'
        )
      )
      OR
      -- Targeted to a plan the user has an active subscription to
      (
        announcements.plan_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.plan_id = announcements.plan_id
            AND s.user_id = auth.uid()
            AND s.status = 'active'
        )
      )
    )
  );

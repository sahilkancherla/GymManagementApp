-- Announcements: gym admins write posts that all members of the gym can read.

CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX announcements_gym_created_idx
  ON announcements (gym_id, pinned DESC, created_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Server enforces access via service role; these RLS policies are defense-in-depth
-- for any direct client reads.
CREATE POLICY "Announcements viewable by gym members" ON announcements
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM gym_members gm
      WHERE gm.gym_id = announcements.gym_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

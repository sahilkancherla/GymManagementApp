-- =====================================================================
-- Split gym_members into membership + roles
--
-- Before: gym_members(gym_id, user_id, role, status) with UNIQUE(gym_id, user_id, role)
--   → one row per (user, gym, role); a user with 3 roles has 3 rows
--   → status duplicated across rows
--
-- After:  gym_members(gym_id, user_id, status)       with UNIQUE(gym_id, user_id)
--         gym_member_roles(member_id, role)          with PK(member_id, role)
--   → one membership per (user, gym), roles live in a child table
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop dependent policies and functions that reference the old shape
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own memberships" ON gym_members;
DROP POLICY IF EXISTS "Gym members can view co-members" ON gym_members;
DROP POLICY IF EXISTS "Gym members insertable by authenticated" ON gym_members;
DROP POLICY IF EXISTS "Gym members updatable by authenticated" ON gym_members;

DROP FUNCTION IF EXISTS is_gym_role(uuid, text);
DROP FUNCTION IF EXISTS is_gym_member(uuid);

-- ---------------------------------------------------------------------
-- 2. Rename the legacy table out of the way
-- ---------------------------------------------------------------------
ALTER TABLE gym_members RENAME TO gym_members_legacy;
ALTER INDEX idx_gym_members_gym_id  RENAME TO idx_gym_members_legacy_gym_id;
ALTER INDEX idx_gym_members_user_id RENAME TO idx_gym_members_legacy_user_id;

-- ---------------------------------------------------------------------
-- 3. Create the new tables
-- ---------------------------------------------------------------------
CREATE TABLE gym_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, user_id)
);

CREATE INDEX idx_gym_members_gym_id  ON gym_members(gym_id);
CREATE INDEX idx_gym_members_user_id ON gym_members(user_id);

CREATE TABLE gym_member_roles (
  member_id uuid NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member', 'coach', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, role)
);

CREATE INDEX idx_gym_member_roles_role ON gym_member_roles(role);

-- ---------------------------------------------------------------------
-- 4. Backfill from the legacy table
-- ---------------------------------------------------------------------
-- One membership per (gym, user). Status = 'active' if ANY legacy row
-- was active; otherwise 'inactive'. created_at = earliest legacy row.
INSERT INTO gym_members (gym_id, user_id, status, created_at)
SELECT
  gym_id,
  user_id,
  CASE WHEN bool_or(status = 'active') THEN 'active' ELSE 'inactive' END AS status,
  min(created_at) AS created_at
FROM gym_members_legacy
GROUP BY gym_id, user_id;

-- Move roles into gym_member_roles, keyed by the new membership id
INSERT INTO gym_member_roles (member_id, role, created_at)
SELECT gm.id, l.role, l.created_at
FROM gym_members_legacy l
JOIN gym_members gm
  ON gm.gym_id = l.gym_id
 AND gm.user_id = l.user_id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. RLS policies on the new tables
-- ---------------------------------------------------------------------
ALTER TABLE gym_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_member_roles ENABLE ROW LEVEL SECURITY;

-- gym_members: a user can see their own memberships and memberships of co-members
CREATE POLICY "Users can view own memberships" ON gym_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Gym members can view co-members" ON gym_members
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT gm.gym_id FROM gym_members gm WHERE gm.user_id = auth.uid()));

CREATE POLICY "Gym members insertable by authenticated" ON gym_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Gym members updatable by authenticated" ON gym_members
  FOR UPDATE TO authenticated USING (true);

-- gym_member_roles: visibility follows membership visibility
CREATE POLICY "View own roles" ON gym_member_roles
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM gym_members WHERE user_id = auth.uid()));

CREATE POLICY "View co-member roles" ON gym_member_roles
  FOR SELECT TO authenticated
  USING (member_id IN (
    SELECT m.id FROM gym_members m
    WHERE m.gym_id IN (SELECT gm.gym_id FROM gym_members gm WHERE gm.user_id = auth.uid())
  ));

CREATE POLICY "Roles insertable by authenticated" ON gym_member_roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Roles deletable by authenticated" ON gym_member_roles
  FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 6. Helper functions (signature preserved so callers don't break)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_gym_role(p_gym_id uuid, p_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM gym_members m
    JOIN gym_member_roles r ON r.member_id = m.id
    WHERE m.gym_id = p_gym_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND r.role = p_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_gym_member(p_gym_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE gym_id = p_gym_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------
-- 7. Drop the legacy table
-- ---------------------------------------------------------------------
DROP TABLE gym_members_legacy;

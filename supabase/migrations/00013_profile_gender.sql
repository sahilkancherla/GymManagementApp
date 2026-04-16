-- Add a gender column to profiles. Values are constrained to a small enum set
-- (matches the shared GENDERS constant). Nullable so existing rows don't need
-- a backfill and users can leave it unset.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

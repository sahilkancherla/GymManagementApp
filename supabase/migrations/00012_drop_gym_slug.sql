-- Drop the gym `slug` column. The column used to support URL routing and
-- the `/gyms/lookup/:slug` endpoint; both now use the gym id / name instead.

ALTER TABLE gyms DROP COLUMN IF EXISTS slug;

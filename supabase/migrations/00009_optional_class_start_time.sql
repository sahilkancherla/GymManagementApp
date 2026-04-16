-- Make start_time optional on classes and class_occurrences. Classes can
-- now be scheduled without a fixed time (e.g., informal open-gym blocks).

ALTER TABLE classes
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN start_time DROP DEFAULT;

ALTER TABLE class_occurrences
  ALTER COLUMN start_time DROP NOT NULL;

-- The existing UNIQUE (class_id, date, start_time) constraint treats NULLs
-- as distinct, which would allow multiple timeless occurrences for the same
-- class/date. Replace it with a NULLS NOT DISTINCT variant so a class still
-- has exactly one occurrence per date regardless of whether it has a time.
ALTER TABLE class_occurrences
  DROP CONSTRAINT IF EXISTS class_occurrences_class_id_date_start_time_key;

ALTER TABLE class_occurrences
  ADD CONSTRAINT class_occurrences_class_id_date_start_time_key
  UNIQUE NULLS NOT DISTINCT (class_id, date, start_time);

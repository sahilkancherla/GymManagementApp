-- Allow per-occurrence start_time overrides by keying uniqueness on
-- (class_id, date) alone. The old constraint included start_time, which
-- meant overriding the time would orphan the original occurrence (its
-- sign-ups + overrides) and create a brand-new row on next find-or-create.

ALTER TABLE class_occurrences
  DROP CONSTRAINT IF EXISTS class_occurrences_class_id_date_start_time_key;

ALTER TABLE class_occurrences
  ADD CONSTRAINT class_occurrences_class_id_date_key
  UNIQUE (class_id, date);

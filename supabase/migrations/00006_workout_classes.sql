-- ============================================
-- Workout ↔ Class association
-- ============================================
-- By default, a workout applies to all classes in its program.
-- If rows exist in workout_classes for a given workout_id, the workout
-- is scoped to only those classes. An empty set (no rows) = all classes.

CREATE TABLE workout_classes (
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_id, class_id)
);

CREATE INDEX idx_workout_classes_class_id ON workout_classes(class_id);

ALTER TABLE workout_classes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read workout_class links (visibility is gated
-- at the workouts/classes level; this is just a join table).
CREATE POLICY "workout_classes readable by authenticated"
  ON workout_classes FOR SELECT
  TO authenticated
  USING (true);

-- Writes happen through the Express service role key, so no permissive
-- write policy is needed for end users.

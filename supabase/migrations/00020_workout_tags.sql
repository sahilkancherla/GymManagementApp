-- Add tags column to workouts (fixed-set labels like weightlifting, benchmark, cardio)
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

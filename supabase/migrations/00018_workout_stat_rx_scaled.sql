-- Add rx_scaled column to workout_stats.
-- 'rx' = prescribed weight/movements, 'scaled' = modified.
-- Nullable so existing rows don't need a backfill.

ALTER TABLE workout_stats
  ADD COLUMN IF NOT EXISTS rx_scaled text;

ALTER TABLE workout_stats
  ADD CONSTRAINT workout_stats_rx_scaled_check
  CHECK (rx_scaled IS NULL OR rx_scaled IN ('rx', 'scaled'));

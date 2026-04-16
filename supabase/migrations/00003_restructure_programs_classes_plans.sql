-- ============================================
-- Restructure Programs, Classes, and Plans
-- ============================================

-- ============================================
-- Programs: add start_date and end_date
-- ============================================

ALTER TABLE programs ADD COLUMN start_date date;
ALTER TABLE programs ADD COLUMN end_date date;

-- ============================================
-- Classes: move schedule data onto class directly
-- ============================================

-- Add time/schedule columns to classes
ALTER TABLE classes ADD COLUMN start_time time NOT NULL DEFAULT '00:00';
ALTER TABLE classes ADD COLUMN days_of_week integer[] NOT NULL DEFAULT '{}';
ALTER TABLE classes ADD COLUMN one_off_date date;

-- Rename default_coach_id to coach_id
ALTER TABLE classes RENAME COLUMN default_coach_id TO coach_id;

-- Add check constraint for days_of_week values (0=Sunday through 6=Saturday)
ALTER TABLE classes ADD CONSTRAINT classes_days_of_week_check
  CHECK (days_of_week <@ ARRAY[0,1,2,3,4,5,6]);

-- Drop class_schedules table (schedule info now lives on classes)
DROP TABLE IF EXISTS class_schedules;

-- ============================================
-- Plans: add program_id, rename billing_period to type
-- ============================================

-- Add program association
ALTER TABLE plans ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

-- Rename billing_period to type and update allowed values
-- First update existing data
UPDATE plans SET billing_period = 'annual' WHERE billing_period = 'yearly';

-- Drop the old check constraint (auto-generated name)
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_billing_period_check;

-- Rename the column
ALTER TABLE plans RENAME COLUMN billing_period TO type;

-- Add new check constraint
ALTER TABLE plans ADD CONSTRAINT plans_type_check
  CHECK (type IN ('count', 'monthly', 'annual'));

-- Index for plan -> program lookups
CREATE INDEX idx_plans_program_id ON plans(program_id);

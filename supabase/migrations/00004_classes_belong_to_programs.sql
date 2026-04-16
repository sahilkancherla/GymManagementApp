-- ============================================
-- Classes and Plans now belong to Programs
-- ============================================

-- Add program_id to classes (classes belong to programs, not directly to gyms)
ALTER TABLE classes ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE CASCADE;

-- Index for program -> class lookups
CREATE INDEX idx_classes_program_id ON classes(program_id);

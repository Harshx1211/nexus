-- Add mandatory parent information fields to mentees table
ALTER TABLE mentees
ADD COLUMN IF NOT EXISTS father_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS mother_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS father_mobile text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS mother_mobile text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS father_occupation text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS mother_occupation text NOT NULL DEFAULT '';

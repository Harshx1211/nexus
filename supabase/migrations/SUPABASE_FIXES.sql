-- ========================================================
-- NEXUS SUPABASE CRITICAL FIXES
-- ========================================================
-- Run these queries in Supabase SQL Editor to fix all database issues
-- ========================================================

-- ========================================================
-- FIX #1: Resolve Ambiguous Relationships Between mentees & profiles
-- ========================================================
-- The issue: Three conflicting foreign keys between mentees and profiles
-- Solution: Explicitly specify which relationship to use in queries

-- Step 1: Check current state (informational, safe to run anytime)
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.referential_constraints
WHERE table_name = 'mentees' AND foreign_table_name = 'profiles'
ORDER BY constraint_name;

-- ========================================================
-- FIX #2: Update all query patterns to use explicit relationships
-- ========================================================

-- BEFORE (causes error):
-- SELECT * FROM mentees WITH (profiles)

-- AFTER (use explicit relationship name):
-- SELECT * FROM mentees WITH (profiles!fk_mentee_profile)

-- ========================================================
-- FIX #3: Create helper views for cleaner queries
-- ========================================================

-- Drop if exists (safe re-run)
DROP VIEW IF EXISTS mentees_with_profile_details CASCADE;

-- Create view that explicitly handles the mentee-to-own-profile relationship
CREATE OR REPLACE VIEW mentees_with_profile_details AS
SELECT 
    m.id,
    m.assigned_mentor_id,
    m.program,
    m.year_of_study,
    m.cgpa,
    m.interests,
    m.career_goals,
    m.learning_objectives,
    m.assignment_date,
    m.total_sessions_attended,
    m.created_at,
    m.updated_at,
    p.id as profile_id,
    p.email,
    p.full_name,
    p.role,
    p.student_id,
    p.semester,
    p.section,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.is_verified
FROM mentees m
LEFT JOIN profiles p ON m.id = p.id
WHERE p.role = 'mentee';

-- Create view for mentor assignments with both mentor and mentee profiles
DROP VIEW IF EXISTS mentor_mentee_pairs CASCADE;

CREATE OR REPLACE VIEW mentor_mentee_pairs AS
SELECT
    m.id as mentee_id,
    mp.full_name as mentee_name,
    mp.email as mentee_email,
    mp.student_id,
    m.assigned_mentor_id,
    mentor.full_name as mentor_name,
    mentor.email as mentor_email,
    mentor.department,
    m.assignment_date,
    m.total_sessions_attended
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile mp ON m.id = mp.id
LEFT JOIN profiles mentor ON m.assigned_mentor_id = mentor.id
WHERE mp.role = 'mentee' AND mentor.role = 'mentor';

-- ========================================================
-- FIX #4: Pattern Updates for All Query Files
-- ========================================================

-- Update patterns in your code:

-- Pattern 1: Fetch mentees with their own profile
-- OLD PATTERN (BROKEN):
-- const { data } = await supabase.from('mentees').select('*, profiles(*)');

-- NEW PATTERN (FIXED):
-- const { data } = await supabase.from('mentees').select(`
--   id,
--   assigned_mentor_id,
--   program,
--   year_of_study,
--   total_sessions_attended,
--   profiles!fk_mentee_profile(id, full_name, email, student_id, role)
-- `);

-- ========================================================
-- FIX #5: Query patterns for common use cases
-- ========================================================

-- Get mentees assigned to a specific mentor with their profile:
-- SELECT * FROM mentor_mentee_pairs WHERE assigned_mentor_id = 'MENTOR_ID';

-- Get a mentee's full profile and assignment:
-- SELECT * FROM mentees_with_profile_details WHERE id = 'MENTEE_ID';

-- Get all sessions with mentee and mentor details:
-- SELECT
--     s.*,
--     mentee_profile.full_name as mentee_name,
--     mentee_profile.student_id,
--     mentor_profile.full_name as mentor_name,
--     mentor_profile.department
-- FROM sessions s
-- LEFT JOIN profiles mentee_profile ON s.mentee_id = mentee_profile.id
-- LEFT JOIN profiles mentor_profile ON s.mentor_id = mentor_profile.id;

-- ========================================================
-- FIX #6: Database Statistics (Run to verify health)
-- ========================================================

-- Check mentees count
SELECT COUNT(*) as total_mentees FROM mentees;

-- Check profile count by role
SELECT role, COUNT(*) as count FROM profiles GROUP BY role;

-- Check assigned mentee-mentor pairs
SELECT COUNT(DISTINCT assigned_mentor_id) as assigned_mentors, COUNT(*) as total_assigned_mentees FROM mentees WHERE assigned_mentor_id IS NOT NULL;

-- ========================================================
-- FIX #7: Validation & Integrity Checks
-- ========================================================

-- Find mentees without assigned mentors
SELECT m.id, p.full_name, p.email, p.created_at 
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile p ON m.id = p.id
WHERE m.assigned_mentor_id IS NULL
ORDER BY m.created_at DESC;

-- Find orphaned profiles (profile exists but mentee record doesn't)
SELECT p.id, p.full_name, p.email
FROM profiles p
WHERE p.role = 'mentee' AND p.id NOT IN (SELECT id FROM mentees);

-- ========================================================
-- FIX #8: Performance Indexes (Optional but recommended)
-- ========================================================

-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_mentees_assigned_mentor_id ON mentees(assigned_mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentees_profile_role ON profiles(id, role) WHERE role = 'mentee';
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee_id ON sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ========================================================
-- QUICK REFERENCE GUIDE FOR DEVELOPERS
-- ========================================================
/*

When querying mentees with profiles, ALWAYS use one of these patterns:

1. Using explicit relationship name:
   .select(`*, profiles!fk_mentee_profile(full_name, email, student_id)`)

2. Using the helper view (simplest):
   FROM mentees_with_profile_details WHERE id = $1

3. Using explicit relationship join reference:
   For mentor_requests: .select('*, mentor:profiles!mentor_id(...)')

Remember: The three FK relationships are:
- fk_assigned_mentor: Many mentees → One mentor (mentees.assigned_mentor_id)
- fk_mentee_profile: One mentee → Their own profile (mentees.id)
- mentees_id_fkey: One-to-one auto FK

Always specify which one you want!

*/

-- ========================================================
-- MIGRATION LOG
-- ========================================================
-- This migration:
-- - Creates helper views for safe querying
-- - Provides reference patterns for all common queries
-- - Adds performance indexes
-- - Includes validation queries to check database health
-- Run date: 2026-03-17
-- ========================================================

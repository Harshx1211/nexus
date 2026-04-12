-- ========================================================
-- NEXUS SUPABASE TASK & STORAGE FIX
-- ========================================================
-- This script fixes issues with task submissions and 
-- ensures the marksheets storage bucket is functional.
-- ========================================================

-- 1. TASK PERMISSIONS (assignments table)
ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean recreation
DROP POLICY IF EXISTS "Mentors can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Mentees can view assigned assignments" ON public.assignments;
DROP POLICY IF EXISTS "Mentees can update assigned assignments" ON public.assignments;
DROP POLICY IF EXISTS "Mentors can manage own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Mentees can view assigned tasks" ON public.assignments;
DROP POLICY IF EXISTS "Mentees can update assigned tasks" ON public.assignments;

-- Create robust policies
CREATE POLICY "Mentors can manage own assignments" 
ON public.assignments FOR ALL 
USING (mentor_id = auth.uid());

CREATE POLICY "Mentees can view assigned tasks" 
ON public.assignments FOR SELECT 
USING (mentee_id = auth.uid());

CREATE POLICY "Mentees can update assigned tasks" 
ON public.assignments FOR UPDATE 
USING (mentee_id = auth.uid())
WITH CHECK (mentee_id = auth.uid());


-- 2. STORAGE PERMISSIONS (marksheets bucket)
-- NOTE: You must first ensure the 'marksheets' bucket exists in 
-- Supabase Dashboard -> Storage -> New Bucket (name it 'marksheets', make it PUBLIC)

-- If the bucket is already created, these policies will ensure it's usable
-- Run these in the SQL Editor to fix storage access:

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Mentee Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Mentee Delete Own Files" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'marksheets');

CREATE POLICY "Mentee Upload Access" ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'marksheets' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Mentee Delete Own Files" ON storage.objects FOR DELETE
USING (
    bucket_id = 'marksheets' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

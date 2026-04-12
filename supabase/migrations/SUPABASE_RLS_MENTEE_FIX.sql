-- ========================================================
-- NEXUS SUPABASE MENTEE RLS & PERSISTENCE FIX
-- ========================================================
-- This script ensures that mentees can read/write their own
-- data and mentors can read their assigned mentees' details.
-- ========================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.mentees ENABLE ROW LEVEL SECURITY;

-- 2. SELECT POLICIES
-- Allow mentees to see their own record (Important: This was missing!)
DROP POLICY IF EXISTS "Users can view own mentee record" ON public.mentees;
DROP POLICY IF EXISTS "Mentees can view own record" ON public.mentees;
CREATE POLICY "Mentees can view own record" 
ON public.mentees FOR SELECT 
USING (auth.uid() = id);

-- Allow mentors to see their assigned mentees' records
DROP POLICY IF EXISTS "Mentors can view assigned mentees" ON public.mentees;
CREATE POLICY "Mentors can view assigned mentees" 
ON public.mentees FOR SELECT 
USING (auth.uid() = assigned_mentor_id);

-- 3. INSERT POLICIES
DROP POLICY IF EXISTS "Mentees can insert own record" ON public.mentees;
CREATE POLICY "Mentees can insert own record" 
ON public.mentees FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. UPDATE POLICIES
DROP POLICY IF EXISTS "Mentees can update own record" ON public.mentees;
CREATE POLICY "Mentees can update own record" 
ON public.mentees FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. VERIFICATION
-- Check profiles for any missing mentee records (Self-healing is done in trigger, but this helps verify)
-- SELECT p.id, p.full_name FROM public.profiles p 
-- LEFT JOIN public.mentees m ON p.id = m.id 
-- WHERE p.role = 'mentee' AND m.id IS NULL;

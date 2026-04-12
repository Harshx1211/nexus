-- ========================================================
-- NEXUS SUPABASE REGISTRATION & IDENTITY FIX
-- ========================================================
-- This script fixes the registration redirection issue by 
-- allowing new users to manage their own profile and metadata.
-- ========================================================

-- 1. Enable RLS on core tables (Safe to run if already enabled)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mentees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mentors ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR: profiles
-- IMPORTANT: Everyone can SELECT (already in SUPABASE_RLS_RECONCILE.sql)
-- But we need INSERT and UPDATE for the user themselves.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);


-- 3. POLICIES FOR: mentees
-- Allow mentees to manage their own metadata record

DROP POLICY IF EXISTS "Mentees can insert own record" ON public.mentees;
CREATE POLICY "Mentees can insert own record" 
ON public.mentees FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Mentees can update own record" ON public.mentees;
CREATE POLICY "Mentees can update own record" 
ON public.mentees FOR UPDATE 
USING (auth.uid() = id);


-- 4. POLICIES FOR: mentors
-- Allow mentors to manage their own metadata record

DROP POLICY IF EXISTS "Mentors can insert own record" ON public.mentors;
CREATE POLICY "Mentors can insert own record" 
ON public.mentors FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Mentors can update own record" ON public.mentors;
CREATE POLICY "Mentors can update own record" 
ON public.mentors FOR UPDATE 
USING (auth.uid() = id);

-- ========================================================
-- VERIFICATION QUERIES
-- ========================================================
-- SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'mentees', 'mentors');
-- ========================================================

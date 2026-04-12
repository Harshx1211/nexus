-- ========================================================
-- NEXUS USER PROVISIONING & IDENTITY SYNC FIX
-- ========================================================
-- This script fixes the issue where registered users are in auth.users
-- but missing from public.profiles or public.mentees, making them
-- unidentifiable by mentors for assignment.
-- ========================================================

-- 1. UPGRADED FUNCTION: Robust User Sync from Metadata
-- Now captures student_id, semester, section, and parent details.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles (id, email, full_name, role, created_at, student_id, semester, section)
  -- Uses ON CONFLICT to update if manual upsert already happened, otherwise inserts from metadata.
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    student_id, 
    semester, 
    section,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'mentee'),
    new.raw_user_meta_data->>'student_id',
    new.raw_user_meta_data->>'semester',
    new.raw_user_meta_data->>'section',
    now(),
    now()
  ) 
  ON CONFLICT (id) DO UPDATE SET
    student_id = COALESCE(public.profiles.student_id, EXCLUDED.student_id),
    semester = COALESCE(public.profiles.semester, EXCLUDED.semester),
    section = COALESCE(public.profiles.section, EXCLUDED.section),
    updated_at = now();

  -- If it's a mentee, ensure they have a row in the mentees table with parent info
  IF (COALESCE(new.raw_user_meta_data->>'role', 'mentee') = 'mentee') THEN
    INSERT INTO public.mentees (
      id, 
      father_name, 
      mother_name, 
      father_mobile, 
      mother_mobile, 
      father_occupation, 
      mother_occupation,
      created_at,
      updated_at
    )
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'father_name', ''),
      COALESCE(new.raw_user_meta_data->>'mother_name', ''),
      COALESCE(new.raw_user_meta_data->>'father_mobile', ''),
      COALESCE(new.raw_user_meta_data->>'mother_mobile', ''),
      COALESCE(new.raw_user_meta_data->>'father_occupation', ''),
      COALESCE(new.raw_user_meta_data->>'mother_occupation', ''),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET 
      father_name = COALESCE(NULLIF(public.mentees.father_name, ''), EXCLUDED.father_name),
      mother_name = COALESCE(NULLIF(public.mentees.mother_name, ''), EXCLUDED.mother_name),
      father_mobile = COALESCE(NULLIF(public.mentees.father_mobile, ''), EXCLUDED.father_mobile),
      mother_mobile = COALESCE(NULLIF(public.mentees.mother_mobile, ''), EXCLUDED.mother_mobile),
      updated_at = now();
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RE-APPLY TRIGGER (Just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. MASS REPAIR: Sync all existing Auth Users who are "orphaned"
-- This solves the problem for 'harsh' and anyone else trapped in Auth but not in mentees table.

-- Phase A: Fill missing profiles from auth.users metadata
INSERT INTO public.profiles (id, email, full_name, role, student_id, semester, section, created_at, updated_at)
SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', 'User'), 
    COALESCE(u.raw_user_meta_data->>'role', 'mentee'),
    u.raw_user_meta_data->>'student_id',
    u.raw_user_meta_data->>'semester',
    u.raw_user_meta_data->>'section',
    u.created_at,
    now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Phase B: Fill missing mentees from auth.users metadata
INSERT INTO public.mentees (id, father_name, mother_name, father_mobile, mother_mobile, father_occupation, mother_occupation, created_at, updated_at)
SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'father_name', ''),
    COALESCE(u.raw_user_meta_data->>'mother_name', ''),
    COALESCE(u.raw_user_meta_data->>'father_mobile', ''),
    COALESCE(u.raw_user_meta_data->>'mother_mobile', ''),
    COALESCE(u.raw_user_meta_data->>'father_occupation', ''),
    COALESCE(u.raw_user_meta_data->>'mother_occupation', ''),
    u.created_at,
    now()
FROM auth.users u
WHERE (u.raw_user_meta_data->>'role' = 'mentee' OR u.raw_user_meta_data->>'role' IS NULL)
AND NOT EXISTS (SELECT 1 FROM public.mentees m WHERE m.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Phase C: Final Validation query for the SQL editor output
SELECT 
    count(u.id) as auth_count,
    count(p.id) as profile_count,
    count(m.id) as mentee_count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.mentees m ON u.id = m.id;

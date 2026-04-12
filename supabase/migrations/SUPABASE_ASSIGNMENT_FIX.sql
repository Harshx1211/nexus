-- ========================================================
-- NEXUS SUPABASE MENTOR ASSIGNMENT FIX
-- ========================================================
-- This script fixes the "Unassigned" issue by ensuring 
-- mentees have records and the assignment trigger is robust.
-- ========================================================

-- 1. REPAIR: Create missing records in the mentees table
-- Some users might have been created before the provisioning trigger was added.
INSERT INTO public.mentees (id, created_at)
SELECT p.id, p.created_at 
FROM public.profiles p
WHERE p.role = 'mentee' 
AND NOT EXISTS (SELECT 1 FROM public.mentees m WHERE m.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- 2. ROBUST TRIGGER: Handle Mentor Request Acceptance
-- Upgraded to use INSERT ... ON CONFLICT (UPSERT)
CREATE OR REPLACE FUNCTION public.handle_mentor_request_accepted()
RETURNS trigger AS $$
BEGIN
  -- Check if the status changed to 'accepted'
  IF (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted')) THEN
    
    -- Use UPSERT logic to ensure the record exists and is updated
    INSERT INTO public.mentees (id, assigned_mentor_id, assignment_date, updated_at)
    VALUES (NEW.mentee_id, NEW.mentor_id, now(), now())
    ON CONFLICT (id) DO UPDATE SET 
      assigned_mentor_id = EXCLUDED.assigned_mentor_id,
      assignment_date = EXCLUDED.assignment_date,
      updated_at = EXCLUDED.updated_at;

    -- Create a notification for the Mentor
    INSERT INTO public.notifications (recipient_id, type, title, content, link, is_read, created_at)
    SELECT 
      NEW.mentor_id, 
      'request', 
      'Request Accepted!', 
      p.full_name || ' is now your mentee.', 
      '/dashboard/mentees', 
      false, 
      now()
    FROM public.profiles p WHERE p.id = NEW.mentee_id;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS FIXES FOR mentor_requests
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see relevant requests" ON public.mentor_requests;
CREATE POLICY "Users can see relevant requests" 
ON public.mentor_requests FOR SELECT 
USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentors can create requests" ON public.mentor_requests;
CREATE POLICY "Mentors can create requests" 
ON public.mentor_requests FOR INSERT 
WITH CHECK (auth.uid() = mentor_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'mentor'));

DROP POLICY IF EXISTS "Mentees can manage their own requests" ON public.mentor_requests;
CREATE POLICY "Mentees can manage their own requests" 
ON public.mentor_requests FOR UPDATE 
USING (auth.uid() = mentee_id);

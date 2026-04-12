-- ========================================================
-- NEXUS SUPABASE SECURITY HARDENING (FINAL)
-- ========================================================
-- This script secures the Sessions and Medical Leaves tables
-- which were previously missing explicit RLS protection.
-- ========================================================

-- 1. SECURE: sessions table
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see relevant sessions" ON public.sessions;
CREATE POLICY "Users can see relevant sessions"
ON public.sessions FOR SELECT
USING (
  mentor_id = auth.uid() 
  OR 
  mentee_id = auth.uid()
  OR
  (mentee_id IS NULL AND EXISTS (
    SELECT 1 FROM public.mentees m 
    WHERE m.assigned_mentor_id = public.sessions.mentor_id 
    AND m.id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Mentors can manage sessions" ON public.sessions;
CREATE POLICY "Mentors can manage sessions"
ON public.sessions FOR ALL
USING (mentor_id = auth.uid());

-- 2. SECURE: medical_leaves table
ALTER TABLE IF EXISTS public.medical_leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see relevant medical leaves" ON public.medical_leaves;
CREATE POLICY "Users can see relevant medical leaves"
ON public.medical_leaves FOR SELECT
USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

DROP POLICY IF EXISTS "Mentees can request medical leaves" ON public.medical_leaves;
CREATE POLICY "Mentees can request medical leaves"
ON public.medical_leaves FOR INSERT
WITH CHECK (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentors can respond to medical leaves" ON public.medical_leaves;
CREATE POLICY "Mentors can respond to medical leaves"
ON public.medical_leaves FOR UPDATE
USING (mentor_id = auth.uid());

-- 3. STORAGE SECRECY: medical-reports bucket
-- Ensure high confidentiality for medical documents.
-- NOTE: Please ensure the 'medical-reports' bucket exists in your 
-- Supabase Dashboard -> Storage and is NOT set to 'Public'.

DROP POLICY IF EXISTS "Mentee can upload own reports" ON storage.objects;
CREATE POLICY "Mentee can upload own reports" ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'medical-reports' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Participant can view reports" ON storage.objects;
CREATE POLICY "Participant can view reports" ON storage.objects FOR SELECT 
USING (
    bucket_id = 'medical-reports' AND 
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM public.medical_leaves ml
            WHERE ml.report_file_path = storage.objects.name
            AND ml.mentor_id = auth.uid()
        )
    )
);

-- 4. REAL-TIME RE-SYNC (Ensure all tables are covered)
DO $$ 
BEGIN 
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sessions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE medical_leaves; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE assignments; EXCEPTION WHEN others THEN NULL; END;
END $$;

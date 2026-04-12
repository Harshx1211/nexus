-- ========================================================
-- IMPORTANT: TO AVOID "DEADLOCK DETECTED" ERROR:
-- 1. STOP YOUR LOCAL DEV SERVER (Ctrl+C in terminal)
-- 2. RUN THIS ENTIRE SCRIPT
-- 3. RESTART YOUR DEV SERVER
-- ========================================================

-- 1. Enable RLS on core tables (Safe to run if already enabled)
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR: announcements
DROP POLICY IF EXISTS "Users can see relevant announcements" ON public.announcements;
CREATE POLICY "Users can see relevant announcements"
ON public.announcements FOR SELECT
USING (
  mentor_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.mentees m
    WHERE m.assigned_mentor_id = public.announcements.mentor_id
    AND m.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Mentors can manage own announcements" ON public.announcements;
CREATE POLICY "Mentors can manage own announcements"
ON public.announcements FOR ALL
USING (mentor_id = auth.uid());


-- 3. POLICIES FOR: announcement_reads
DROP POLICY IF EXISTS "Mentees can mark as read" ON public.announcement_reads;
CREATE POLICY "Mentees can mark as read" 
ON public.announcement_reads FOR INSERT 
WITH CHECK (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentees can see own reads" ON public.announcement_reads;
CREATE POLICY "Mentees can see own reads" 
ON public.announcement_reads FOR SELECT 
USING (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentors can see reads for their announcements" ON public.announcement_reads;
CREATE POLICY "Mentors can see reads for their announcements" 
ON public.announcement_reads FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a 
    WHERE a.id = public.announcement_reads.announcement_id 
    AND a.mentor_id = auth.uid()
  )
);


-- 4. POLICIES FOR: notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications"
ON public.notifications FOR SELECT
USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (recipient_id = auth.uid());


-- 5. ENABLE REAL-TIME (Safe to re-run)
-- If you get an error that a table is "already member", it's fine! 
-- It just means real-time was already enabled for that table.
-- 5. ENABLE REAL-TIME (Safe to re-run)
-- If you get an error that a table is "already member", it's fine! 
-- I've split these into separate blocks to avoid "deadlock detected" errors
-- when many tables are updated in a single transaction.

DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcements; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcement_reads; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sessions; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE assignments; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN others THEN NULL; END; END $$;
DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE medical_leaves; EXCEPTION WHEN others THEN NULL; END; END $$;

-- 6. POLICIES FOR: messages [NEW]
-- Ensure messages can be sent and seen by owners
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own messages" ON public.messages;
CREATE POLICY "Users can see own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

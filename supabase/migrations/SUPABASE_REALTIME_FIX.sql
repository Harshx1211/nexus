-- ========================================================
-- SUPABASE REALTIME & RLS FINAL FIX
-- ========================================================
-- This script ensures that the chat_messages table is 
-- fully optimized for real-time delivery and that 
-- both parties can see and receive messages instantly.
-- ========================================================

-- 1. Ensure REPLICA IDENTITY is set to FULL for high-fidelity real-time
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 2. Refine RLS Policies to be more permissive for the participants
-- First, drop the old policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Users can see own chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable read access for participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable insert for sender" ON public.chat_messages;

-- Policy: Comprehensive SELECT for participants
CREATE POLICY "Enable read access for participants" ON public.chat_messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Explicit INSERT for sender
CREATE POLICY "Enable insert for sender" ON public.chat_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 3. Verify Realtime Publication (Silent and Robust)
DO $$ 
BEGIN 
  -- Add to publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- 4. Final verification query
SELECT 
    schemaname, 
    tablename, 
    (SELECT count(*) FROM pg_policies WHERE tablename = 'chat_messages') as policy_count,
    (SELECT relreplident FROM pg_class WHERE relname = 'chat_messages') as replica_identity
FROM pg_catalog.pg_tables 
WHERE tablename = 'chat_messages';

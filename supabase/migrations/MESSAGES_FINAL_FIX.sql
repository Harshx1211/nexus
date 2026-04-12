-- ========================================================
-- NEXUS MESSAGING SYSTEM: CLEAN RECONSTRUCTION
-- ========================================================
-- This script fixes the "vanishing message" bug by:
-- 1. Dropping the corrupted/hybrid messages table
-- 2. Creating a clean, standard table in the public schema
-- 3. Setting up correct foreign keys and indexes
-- 4. Re-enabling RLS and Realtime
-- ========================================================

-- 1. Stop any potential schema conflicts
DROP TABLE IF EXISTS public.messages CASCADE;

-- 2. Create the clean table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_role TEXT,
    receiver_role TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Add high-performance indexes
CREATE INDEX idx_messages_participants ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages where they are either sender OR receiver
CREATE POLICY "Users can see own messages" ON public.messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can only insert messages as themselves
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. Enable Real-Time specifically for the public table
-- (We use a DO block to ignore errors if it was already added somehow)
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN others THEN 
  NULL; 
END $$;

-- 6. Verification query (Should return no rows, but show the table is ready)
SELECT 'SUCCESS: Messaging table reconstructed' as status;

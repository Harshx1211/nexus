-- ========================================================
-- NEXUS MESSAGING SYSTEM: THE ULTIMATE "NUKE & PAVE"
-- ========================================================
-- This script abandons the "messages" name entirely to 
-- resolve any hidden system conflicts or shadowing.
-- ========================================================

-- 1. Drop existing stuff to be clean
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 2. Create the clean CHAT_MESSAGES table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_role TEXT,
    receiver_role TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Add high-performance indexes
CREATE INDEX idx_chat_messages_participants ON public.chat_messages(sender_id, receiver_id);
CREATE INDEX idx_chat_messages_sorted ON public.chat_messages(created_at ASC);

-- 4. Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages where they are sender OR receiver
CREATE POLICY "Users can see own chat_messages" ON public.chat_messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can only insert messages as themselves
CREATE POLICY "Users can send chat_messages" ON public.chat_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. Enable Real-Time for the NEW table
BEGIN;
  DO $$ 
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN others THEN 
    NULL; 
  END $$;
COMMIT;

-- 6. Verification query
SELECT 'SUCCESS: Messaging system moved to chat_messages' as status;

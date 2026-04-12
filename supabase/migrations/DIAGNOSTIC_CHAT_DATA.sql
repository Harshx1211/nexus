-- CHECK RECENT MESSAGES
SELECT 
    id, 
    sender_id, 
    receiver_id, 
    content, 
    created_at,
    sender_role,
    receiver_role
FROM public.chat_messages
ORDER BY created_at DESC
LIMIT 20;

-- Verify RLS again for current user (Mental check: user should run this)
SELECT current_setting('request.jwt.claims', true)::jsonb->>'sub' as current_user_id;

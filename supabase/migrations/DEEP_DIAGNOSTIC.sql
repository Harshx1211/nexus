-- ========================================================
-- DEEP DIAGNOSTIC: LOCKS, TRIGGERS, & REALTIME
-- ========================================================

-- 1. Check for Active Locks on chat_messages
SELECT 
    l.locktype, 
    l.mode, 
    l.granted, 
    a.query, 
    a.query_start, 
    a.state
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation = 'public.chat_messages'::regclass;

-- 2. Check for ANY triggers on chat_messages
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_type
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'chat_messages';

-- 3. Check Realtime Publication Detail
SELECT * FROM pg_publication_tables WHERE tablename = 'chat_messages';

-- 4. Check if we can do a test insert manually via SQL
-- (This confirms if the DB itself is healthy)
-- Replace with a valid sender/receiver ID from your profiles table if you want to test.
-- INSERT INTO chat_messages (sender_id, receiver_id, content) VALUES ('...', '...', 'Diagnostic Test');

-- 5. Check table size and index status
SELECT 
    n.nspname as schema,
    c.relname as table,
    pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
    pg_size_pretty(pg_relation_size(c.oid)) as table_size,
    pg_size_pretty(pg_indexes_size(c.oid)) as index_size
FROM pg_class c
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'chat_messages';

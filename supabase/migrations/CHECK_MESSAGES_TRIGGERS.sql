-- Check for Triggers on the messages table
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS trigger_type,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        WHEN tgtype & 32 = 32 THEN 'TRUNCATE'
    END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'messages';

-- Check for constraints and unique indexes
SELECT
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
WHERE cl.relname = 'messages';

-- Check for indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages';

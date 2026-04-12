-- 1. Check exact table details in public schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for triggers on public.messages specifically
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'messages' AND n.nspname = 'public';

-- 3. Check for RLS policies (FIXED QUERY)
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'messages' AND schemaname = 'public';

-- 4. Check for any views that might be named the same or shadowing
SELECT table_schema, table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'messages';

-- Detailed check for public.messages table
SELECT 
    table_schema,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public';

-- Also check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'messages' AND schemaname = 'public';

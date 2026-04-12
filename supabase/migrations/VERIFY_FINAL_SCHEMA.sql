-- FINAL SCHEMA VERIFICATION
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for any triggers that might be interfering
SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'public.messages'::regclass;

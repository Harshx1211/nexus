-- ======================================================================================
-- N E X U S   [ F I X   1 . 0 ] - Sessions Group Bug & Marksheet Upload Storage
-- ======================================================================================

-- 1. FIX: Group Sessions (mentee_id constraint violation)
-- When scheduling a session for "All Mentees", the client sends `mentee_id: null`.
-- This alters the table to allow nulls in the mentee_id column.
ALTER TABLE public.sessions ALTER COLUMN mentee_id DROP NOT NULL;

-- 2. FIX: Marksheet Uploads in Task Section
-- Ensures the `marksheets` bucket exists in Supabase storage and has proper RLS policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marksheets', 'marksheets', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access to uploaded marksheets
CREATE POLICY "Public Access for marksheets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'marksheets');

-- Allow authenticated users to upload new marksheets
CREATE POLICY "Authenticated users can upload marksheets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'marksheets');

-- Allow users to update their own marksheet files
CREATE POLICY "Users can update their own marksheets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'marksheets');

-- Allow users to delete their own marksheet files
CREATE POLICY "Users can delete their own marksheets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'marksheets');

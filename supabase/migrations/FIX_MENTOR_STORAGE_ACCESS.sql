/* 
  SQL FIXES FOR MENTOR STORAGE ACCESS
  This ensures Mentors can specifically read any file in the 'marksheets' bucket
  even if Public access triggers RLS.
*/

-- Ensure SELECT policy allows mentors to see all marksheets
CREATE POLICY "Mentors can view all marksheets" 
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'marksheets' 
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mentor'
    OR auth.uid() = owner -- Also allow the uploader (mentee)
  )
);

-- Note: We already have a "Public Read Access" policy, but standardizing 
-- with an authenticated Mentor-specific policy is safer for private buckets.
-- If the bucket is Public, the previous policy should have worked, 
-- but this adds an extra layer of explicit permission.

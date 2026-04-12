-- Add batch_id to assignments to group tasks sent to all mentees
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Update existing assignments to group them (heuristic: same mentor, same title, same due_date, same assigned_at hour)
-- This is just for existing data cleanliness
UPDATE assignments a
SET batch_id = gen_random_uuid()
FROM (
  SELECT mentor_id, title, due_date, date_trunc('minute', assigned_at) as minute_trunc
  FROM assignments
  GROUP BY mentor_id, title, due_date, minute_trunc
  HAVING count(*) > 1
) b
WHERE a.mentor_id = b.mentor_id 
  AND a.title = b.title 
  AND a.due_date = b.due_date 
  AND date_trunc('minute', a.assigned_at) = b.minute_trunc
  AND a.batch_id IS NULL;

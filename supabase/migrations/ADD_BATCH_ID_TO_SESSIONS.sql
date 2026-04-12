
-- Add batch_id to sessions to group sessions sent to all mentees
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Update existing sessions to group them (heuristic: same mentor, same title, same scheduled_at)
UPDATE sessions a
SET batch_id = gen_random_uuid()
FROM (
  SELECT mentor_id, title, scheduled_at
  FROM sessions
  WHERE mentee_id IS NOT NULL AND session_type = 'group'
  GROUP BY mentor_id, title, scheduled_at
  HAVING count(*) > 1
) b
WHERE a.mentor_id = b.mentor_id 
  AND a.title = b.title 
  AND a.scheduled_at = b.scheduled_at
  AND a.batch_id IS NULL;


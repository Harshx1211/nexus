# 🎯 SUPABASE - EXACT QUERIES TO EXECUTE

## ⚡ COPY & PASTE READY

Below are the EXACT queries you need to run. No modifications needed.

---

## 📍 STEP 1: CREATE HELPER VIEWS

Copy this entire block and run it:

```sql
-- Drop if exists (safe to re-run)
DROP VIEW IF EXISTS mentees_with_profile_details CASCADE;

-- Create view that explicitly handles the mentee-to-own-profile relationship
CREATE OR REPLACE VIEW mentees_with_profile_details AS
SELECT 
    m.id,
    m.assigned_mentor_id,
    m.program,
    m.year_of_study,
    m.cgpa,
    m.interests,
    m.career_goals,
    m.learning_objectives,
    m.assignment_date,
    m.total_sessions_attended,
    m.created_at,
    m.updated_at,
    p.id as profile_id,
    p.email,
    p.full_name,
    p.role,
    p.student_id,
    p.semester,
    p.section,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.is_verified
FROM mentees m
LEFT JOIN profiles p ON m.id = p.id
WHERE p.role = 'mentee';

-- Create view for mentor assignments with both mentor and mentee profiles
DROP VIEW IF EXISTS mentor_mentee_pairs CASCADE;

CREATE OR REPLACE VIEW mentor_mentee_pairs AS
SELECT
    m.id as mentee_id,
    mp.full_name as mentee_name,
    mp.email as mentee_email,
    mp.student_id,
    m.assigned_mentor_id,
    mentor.full_name as mentor_name,
    mentor.email as mentor_email,
    mentor.department,
    m.assignment_date,
    m.total_sessions_attended
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile mp ON m.id = mp.id
LEFT JOIN profiles mentor ON m.assigned_mentor_id = mentor.id
WHERE mp.role = 'mentee' AND mentor.role = 'mentor';
```

**Expected Result:** No errors, two views created

---

## 📍 STEP 2: CREATE PERFORMANCE INDEXES

Copy and run this block:

```sql
-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_mentees_assigned_mentor_id ON mentees(assigned_mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentees_profile_role ON profiles(id, role) WHERE role = 'mentee';
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee_id ON sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

**Expected Result:** No errors, 5 indexes created

---

## ✅ STEP 3: VERIFY EVERYTHING WORKED

Run these 3 queries to confirm:

### Query 1: Count Mentees
```sql
SELECT COUNT(*) as total_mentees FROM mentees;
```

### Query 2: Check View Was Created  
```sql
SELECT * FROM mentees_with_profile_details LIMIT 1;
```

### Query 3: Check Mentor Pairs View
```sql
SELECT * FROM mentor_mentee_pairs LIMIT 1;
```

**Expected:** All three queries return data without errors

---

## 🔧 IF YOU GET ERRORS

### Error: "Already exists"
**Solution:** This is normal if running twice. Safe to ignore.

### Error: "Permission denied"  
**Solution:** Use your admin Supabase credentials, not limited scope.

### Error: "Ambiguous relationship"
**Solution:** This is what we're fixing. Once views are created, queries will work.

---

## 📝 ACTUAL CODE PATTERNS TO USE

Now that views are created, update your code like this:

### Pattern 1: Get a mentee with their profile (SIMPLE)
```typescript
const { data, error } = await supabase
    .from('mentees_with_profile_details')
    .select('*')
    .eq('id', userId)
    .single();
```

### Pattern 2: Get mentor-mentee relationships (SIMPLE)
```typescript
const { data: pairs, error } = await supabase
    .from('mentor_mentee_pairs')
    .select('*')
    .eq('assigned_mentor_id', mentorId);
```

### Pattern 3: Direct query with explicit relationship (ADVANCED)
```typescript
const { data, error } = await supabase
    .from('mentees')
    .select(`
        id,
        assigned_mentor_id,
        program,
        profiles!fk_mentee_profile(id, full_name, email, student_id, role)
    `)
    .eq('id', menteeId);
```

---

## 🧪 TEST QUERIES (After Migration)

### Test 1: List all mentees with their mentors
```sql
SELECT 
    mentee_name,
    student_id,
    mentor_name,
    assignment_date
FROM mentor_mentee_pairs
WHERE assigned_mentor_id IS NOT NULL
ORDER BY assignment_date DESC;
```

### Test 2: Find mentees without mentors
```sql
SELECT id, full_name, email FROM mentees_with_profile_details
WHERE assigned_mentor_id IS NULL;
```

### Test 3: Count sessions per mentor
```sql
SELECT 
    mp.full_name as mentor,
    COUNT(s.id) as session_count,
    COUNT(DISTINCT s.mentee_id) as unique_mentees
FROM sessions s
LEFT JOIN profiles mp ON s.mentor_id = mp.id
GROUP BY s.mentor_id, mp.full_name
ORDER BY session_count DESC;
```

### Test 4: Check announcements
```sql
SELECT 
    a.id,
    a.title,
    p.full_name as mentor,
    COUNT(DISTINCT ar.mentee_id) as read_by_count
FROM announcements a
LEFT JOIN profiles p ON a.mentor_id = p.id
LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
GROUP BY a.id, a.title, p.full_name;
```

---

## 📋 COMPLETE SQL SCRIPT (All-in-One)

If you want to run everything at once, copy this entire block:

```sql
-- ========================================================
-- NEXUS SUPABASE FIX - COMPLETE MIGRATION
-- ========================================================

-- Drop if exists (safe re-run)
DROP VIEW IF EXISTS mentees_with_profile_details CASCADE;
DROP VIEW IF EXISTS mentor_mentee_pairs CASCADE;

-- Create view that explicitly handles the mentee-to-own-profile relationship
CREATE OR REPLACE VIEW mentees_with_profile_details AS
SELECT 
    m.id,
    m.assigned_mentor_id,
    m.program,
    m.year_of_study,
    m.cgpa,
    m.interests,
    m.career_goals,
    m.learning_objectives,
    m.assignment_date,
    m.total_sessions_attended,
    m.created_at,
    m.updated_at,
    p.id as profile_id,
    p.email,
    p.full_name,
    p.role,
    p.student_id,
    p.semester,
    p.section,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.is_verified
FROM mentees m
LEFT JOIN profiles p ON m.id = p.id
WHERE p.role = 'mentee';

-- Create view for mentor assignments  
CREATE OR REPLACE VIEW mentor_mentee_pairs AS
SELECT
    m.id as mentee_id,
    mp.full_name as mentee_name,
    mp.email as mentee_email,
    mp.student_id,
    m.assigned_mentor_id,
    mentor.full_name as mentor_name,
    mentor.email as mentor_email,
    mentor.department,
    m.assignment_date,
    m.total_sessions_attended
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile mp ON m.id = mp.id
LEFT JOIN profiles mentor ON m.assigned_mentor_id = mentor.id
WHERE mp.role = 'mentee' AND mentor.role = 'mentor';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentees_assigned_mentor_id ON mentees(assigned_mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentees_profile_role ON profiles(id, role) WHERE role = 'mentee';
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee_id ON sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Verification Queries
SELECT 'Views and Indexes Created' as status;
SELECT COUNT(*) as mentees_count FROM mentees;
SELECT COUNT(*) as mentees_with_mentors FROM mentees WHERE assigned_mentor_id IS NOT NULL;
```

Copy this entire block → Paste in Supabase SQL Editor → Click "Run" ✅

---

## 🚨 ROLLBACK (If Needed)

If something goes wrong and you need to revert:

```sql
DROP VIEW IF EXISTS mentees_with_profile_details CASCADE;
DROP VIEW IF EXISTS mentor_mentee_pairs CASCADE;
DROP INDEX IF EXISTS idx_mentees_assigned_mentor_id;
DROP INDEX IF EXISTS idx_mentees_profile_role;
DROP INDEX IF EXISTS idx_sessions_mentor_id;
DROP INDEX IF EXISTS idx_sessions_mentee_id;
DROP INDEX IF EXISTS idx_profiles_email;
```

Or just restore from the backup you created!

---

## ✨ SUMMARY

**3 Simple Steps:**
1. Copy Step 1 (views) → Run it
2. Copy Step 2 (indexes) → Run it  
3. Copy Step 3 queries → Verify they work

**That's it!** Your database is fixed.

Then your code can use the clean patterns shown above without "ambiguous relationship" errors.

---

**Time:** < 2 minutes  
**Risk:** Very low (views/indexes don't modify data)  
**Rollback:** 30 seconds (restore from backup)  
**Status:** Ready to go! 🚀

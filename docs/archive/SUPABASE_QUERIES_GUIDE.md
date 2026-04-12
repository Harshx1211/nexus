# 🗄️ SUPABASE QUERIES - COPY & PASTE

## ⚡ Quick Copy-Paste Guide

### Main Migration: SUPABASE_FIXES.sql

**Location:** In your project root: `SUPABASE_FIXES.sql`

**How to Use:**
1. Open: https://app.supabase.com → Your Project → SQL Editor
2. Click: "+ New Query"
3. Copy the ENTIRE contents of `SUPABASE_FIXES.sql`
4. Paste into SQL Editor
5. Click: "Run" (black icon in top right)
6. Wait for completion

---

## ✅ Verification Queries (Run AFTER migration)

Once migration completes, run these to verify:

### Query 1: Check Mentees Count
```sql
SELECT COUNT(*) as total_mentees FROM mentees;
```
**Expected:** Shows a number (your mentee count)

### Query 2: Check Profiles by Role
```sql
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY count DESC;
```
**Expected Output Example:**
```
role    | count
--------|-------
mentee  | 45
mentor  | 12
admin   | 1
```

### Query 3: Test the Helper View
```sql
SELECT * FROM mentees_with_profile_details LIMIT 5;
```
**Expected:** Shows mentee data with their profile information

### Query 4: Check Assigned Relationships
```sql
SELECT 
    COUNT(*) as total_with_mentor,
    COUNT(DISTINCT assigned_mentor_id) as unique_mentors
FROM mentees 
WHERE assigned_mentor_id IS NOT NULL;
```
**Expected:** Shows mentee-mentor assignment statistics

### Query 5: Find Unassigned Mentees
```sql
SELECT m.id, p.full_name, p.email, m.created_at
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile p ON m.id = p.id
WHERE m.assigned_mentor_id IS NULL
ORDER BY m.created_at DESC
LIMIT 10;
```
**Expected:** Lists mentees without assigned mentors (OK if empty)

---

## 🔍 Diagnostic Queries

If something seems wrong, run these:

### Check for Orphaned Profiles
```sql
-- Find profiles that have no mentee record
SELECT p.id, p.full_name, p.email, p.role
FROM profiles p
WHERE p.role = 'mentee' AND p.id NOT IN (SELECT id FROM mentees);
```
**Expected:** Empty result set (or list of orphaned accounts)

### Check for Orphaned Mentees
```sql
-- Find mentee records that have no profile
SELECT m.id, m.assigned_mentor_id
FROM mentees m
LEFT JOIN profiles!fk_mentee_profile p ON m.id = p.id
WHERE p.id IS NULL;
```
**Expected:** Empty result set

### Count Sessions by Role
```sql
SELECT 
    mp.full_name as mentor,
    fp.full_name as mentee,
    COUNT(s.id) as session_count
FROM sessions s
LEFT JOIN profiles mp ON s.mentor_id = mp.id
LEFT JOIN profiles fp ON s.mentee_id = fp.id
GROUP BY s.mentor_id, s.mentee_id, mp.full_name, fp.full_name
ORDER BY session_count DESC;
```
**Expected:** Shows sessions by mentor-mentee pairs

### Check Announcements
```sql
SELECT a.id, a.title, p.full_name as mentor, COUNT(ar.id) as read_count
FROM announcements a
LEFT JOIN profiles p ON a.mentor_id = p.id
LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id
GROUP BY a.id, a.title, p.full_name;
```
**Expected:** Shows announcement statistics

---

## 📊 Performance Verification

After running migration, check that indexes were created:

### Query 6: Verify Indexes
```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('mentees', 'sessions', 'profiles', 'announcements')
ORDER BY tablename, indexname;
```
**Expected:** Should see these indexes:
- `idx_mentees_assigned_mentor_id`
- `idx_mentees_profile_role`
- `idx_sessions_mentor_id`
- `idx_sessions_mentee_id`
- `idx_profiles_email`

---

## 🐛 Troubleshooting

### Error: "Already exists"
**Cause:** Schema objects already created in a previous run
**Solution:** Safe to ignore. The migration script includes `DROP IF EXISTS` statements which handle this gracefully.

### Error: "Insufficient privilege"
**Cause:** Your Supabase user role doesn't have permission
**Solution:** Use the built-in Admin user or ask your Supabase workspace owner to run the migration

### Error: "Ambiguous relationship"
**Cause:** Code still using old query syntax
**Solution:** Update query patterns to use explicit relationship names:
```typescript
// OLD (broken):
.select('id, full_name, profiles(*)')

// NEW (fixed):
.select(`id, full_name, profiles!fk_mentee_profile(id, full_name, email)`)
```

### Error: "View does not exist"
**Cause:** One of the helper views wasn't created properly
**Solution:** 
1. Check the migration ran without errors
2. Run Query 2 above to verify the view exists
3. If missing, run just that portion of SUPABASE_FIXES.sql again

---

## 🔐 Security Notes

- These migrations only **change query patterns**, not data
- All relationships remain intact
- No data is deleted or modified
- Safe to rollback (simply delete views and indexes)
- Views are read-only (they don't modify data)

---

## ⏱️ Estimated Runtime

| Task | Time |
|------|------|
| Create views | < 1 second |
| Create indexes | 1-5 seconds |
| Verification queries | < 1 second |
| **Total** | **< 10 seconds** |

---

## 📝 Post-Migration Checklist

After running all queries:

- [ ] SUPABASE_FIXES.sql completed without errors
- [ ] Query 1: Returns a valid mentee count
- [ ] Query 2: Shows mentee/mentor/admin breakdown
- [ ] Query 3: Helper view returns data
- [ ] Query 4: Shows assignment statistics
- [ ] Query 5: Lists unassigned mentees (OK if empty)
- [ ] Dashboard loads without "ambiguous relationship" error
- [ ] Messages real-time subscription works
- [ ] Announcements load for mentees
- [ ] Middleware correctly routes mentees away from mentor-only pages

---

## 🚨 If Something Goes Wrong

**Last Resort: Restore from Backup**

1. Go to https://app.supabase.com → Your Project
2. Click "Backups" in sidebar  
3. Click "Restore" on the backup you created before running the migration
4. Wait for restoration to complete (usually 5-10 minutes)
5. The database returns to pre-migration state
6. Contact support: support@nexus-mentorship.com

---

## 📞 Need Help?

- **Supabase Documentation:** https://supabase.com/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Project Support:** support@nexus-mentorship.com

---

**Last Updated:** March 17, 2026  
**Version:** 1.0  
**Status:** Ready to Deploy

# 🎯 QUICK START COMMANDS

Copy and run these in order:

## 1️⃣ BACKUP YOUR DATABASE (FIRST!)

Go to: https://app.supabase.com → Your Project → Backups → Create Backup

⏰ Wait for backup to complete before proceeding.

---

## 2️⃣ RUN SUPABASE SQL MIGRATION

**In Supabase SQL Editor:**
1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click: "+ New Query"  
3. Select ALL text from this file: `SUPABASE_EXACT_QUERIES.md`
4. PASTE into SQL Editor
5. Click: "RUN" (top right)
6. Wait for success ✅

**Expected Output:**
- No errors
- "Views and Indexes Created" message
- 3 verification queries show data

---

## 3️⃣ DEPLOY CODE

```bash
# Make sure you're in project root
cd f:\Final\ Mentor\ Mentee\nexus

# Deploy (your method - Vercel, Railway, etc.)
git push origin main

# OR if using Vercel CLI:
vercel deploy
```

⏰ Wait for deployment to complete

---

## 4️⃣ TEST IN PRODUCTION

### Test #1: Mentor Flow
```
1. Go to: https://yourdomain.com/login
2. Login with mentor account
3. You should see the Mentor Dashboard
4. Click "Mentees" - should show list (no error)
5. Click "Messages" - send test message
6. Check browser console (F12) - should see logger calls, NO console.log
```

### Test #2: Mentee Flow  
```
1. Logout (if needed)
2. Login with mentee account
3. You should see the Academic Dashboard
4. Try to access: https://yourdomain.com/dashboard/mentees
5. Should REDIRECT you to /dashboard (access denied)
6. Check announcements banner (should load)
```

### Test #3: Database
```
In Supabase SQL Editor, run:
SELECT COUNT(*) as mentees FROM mentees;
SELECT * FROM mentees_with_profile_details LIMIT 1;
```
Both should return data without "ambiguous relationship" error.

---

## 🆘 IF SOMETHING BREAKS

### "Ambiguous relationship" error?
→ You didn't run the SQL migration. Go back to Step 2.

### Mentees can access mentor-only pages?
→ Code deployment didn't take. Try redeploying.

### Console full of console.log?
→ Refresh the page. Make sure latest code is deployed.

### Error Boundary shows error UI?
→ Check browser console (F12) for logger details. This is working as designed.

### Not sure what to do?
→ Restore from backup and try again with DEPLOYMENT_READY.md

---

## ✨ ALL DONE!

Once all 4 steps complete successfully:
- ✅ Database fixed
- ✅ Code deployed  
- ✅ Tests passing

You're ready! 🚀

---

## 📞 REFERENCE FILES

- **DEPLOYMENT_READY.md** - Full checklist
- **SUPABASE_EXACT_QUERIES.md** - Copy-paste SQL
- **SUPABASE_QUERIES_GUIDE.md** - Query reference  
- **BUG_FIXES_COMPLETE.md** - Technical details
- **README_BUGS_FIXED.md** - Summary report

**Still have questions?** Review these files in this order!

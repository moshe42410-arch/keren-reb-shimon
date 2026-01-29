# 🚀 העלאה ל-Vercel - מדריך פשוט

## מה צריך לעשות (3 שלבים):

---

## ✅ שלב 1: העלה את הקוד ל-GitHub (חובה!)

**למה?** Vercel צריך לקחת את הקוד מ-GitHub.

### 1.1. צור repository ב-GitHub:

1. לך ל: **https://github.com/new**
2. תן שם (למשל: `excel-analyzer`)
3. **אל תסמן** "Add README"
4. לחץ **"Create repository"**

### 1.2. העלה את הקוד:

GitHub יראה לך הוראות. **הרץ את הפקודות הבאות בטרמינל:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**החלף:**
- `YOUR_USERNAME` = שם המשתמש שלך ב-GitHub
- `YOUR_REPO_NAME` = השם שנתת ל-repository

**דוגמה:**
אם השם שלך ב-GitHub הוא `moshe` והשם של ה-repository הוא `excel-analyzer`, אז:
```bash
git remote add origin https://github.com/moshe/excel-analyzer.git
git branch -M main
git push -u origin main
```

---

## ✅ שלב 2: חבר את GitHub ל-Vercel

### במסך Vercel שבו אתה נמצא:

1. לחץ על **"Install"** (הכפתור עם הלוגו של GitHub)
2. זה יפתח חלון של GitHub
3. לחץ **"Authorize Vercel"** (או "אשר")
4. חזור ל-Vercel

### עכשיו תראה את ה-repositories שלך:

1. **בחר** את ה-repository שיצרת (excel-analyzer או השם שנתת)
2. לחץ **"Import"**

---

## ✅ שלב 3: הגדר את הפרויקט

### 3.1. Vercel יזהה את הפרויקט אוטומטית:

- Framework: Vite ✅
- Build Command: `npm run build` ✅
- Output Directory: `dist` ✅

**אל תשנה כלום - זה כבר נכון!**

### 3.2. הוסף משתני סביבה (חשוב!):

1. לחץ על **"Environment Variables"** (או "משתני סביבה")
2. הוסף:

   **משתנה 1:**
   - Name: `VITE_GOOGLE_SHEETS_API_KEY`
   - Value: המפתח שלך (תוכל להוסיף אחר כך אם אין לך)
   - לחץ "Add"

   **משתנה 2:**
   - Name: `VITE_GOOGLE_APPS_SCRIPT_URL`
   - Value: ה-URL של Google Apps Script (תוכל להוסיף אחר כך)
   - לחץ "Add"

### 3.3. Deploy!

1. לחץ על **"Deploy"** (כחול למטה)
2. המתן 1-2 דקות
3. תקבל קישור לאתר! 🎉

---

## 📝 סיכום מהיר:

1. ✅ צור repository ב-GitHub
2. ✅ הרץ 3 פקודות בטרמינל (git remote, git branch, git push)
3. ✅ ב-Vercel: לחץ "Install" (GitHub)
4. ✅ בחר את ה-repository
5. ✅ הוסף משתני סביבה
6. ✅ לחץ "Deploy"

---

## ⚠️ הערות:

- **אם אין לך API KEY עכשיו** - תוכל להוסיף אותו אחר כך ב-Settings של Vercel
- **אם אין לך Google Apps Script URL** - תוכל להוסיף אותו אחר כך
- **האתר יעבוד גם בלי המשתנים האלה** (רק חלק מהפיצ'רים לא יעבדו)

---

**זה הכל! 🚀**

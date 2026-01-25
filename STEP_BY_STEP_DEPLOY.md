# 🚀 מדריך שלב אחר שלב - העלאה לאוויר

## שלב 1: הכנת הקוד ל-Git (2 דקות)

### 1.1. אתחל Git בפרויקט
```bash
git init
```

### 1.2. הוסף את כל הקבצים
```bash
git add .
```

### 1.3. צור commit ראשון
```bash
git commit -m "Initial commit - ready for deployment"
```

---

## שלב 2: העלאה ל-GitHub (5 דקות)

### 2.1. צור repository חדש ב-GitHub

1. לך ל-[github.com](https://github.com) והתחבר
2. לחץ על **"+"** למעלה מימין > **"New repository"**
3. תן שם ל-repository (למשל: `excel-analyzer` או `hi-tek`)
4. **אל תסמן** "Initialize with README" (כי כבר יש לך קוד)
5. לחץ **"Create repository"**

### 2.2. העלה את הקוד ל-GitHub

GitHub יראה לך הוראות. הרץ את הפקודות הבאות (החלף `YOUR_USERNAME` ו-`YOUR_REPO_NAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**או אם אתה משתמש ב-SSH:**
```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## שלב 3: חיבור ל-Vercel (3 דקות)

### 3.1. במסך Vercel שבו אתה נמצא עכשיו:

**אפשרות א' - דרך GitHub (מומלץ):**
1. לחץ על **"Install"** (הכפתור עם הלוגו של GitHub)
2. זה יפתח חלון של GitHub
3. **אשר** את ההרשאות ל-Vercel
4. חזור ל-Vercel - תראה את ה-repositories שלך
5. **בחר** את ה-repository שיצרת (excel-analyzer או השם שנתת)
6. לחץ **"Import"**

**אפשרות ב' - דרך URL:**
1. העתק את ה-URL של ה-repository מ-GitHub (למשל: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`)
2. הדבק בשדה **"Enter a Git repository URL to deploy..."**
3. לחץ **"Continue"**

### 3.2. הגדרת הפרויקט ב-Vercel

אחרי ש-Vercel מזהה את הפרויקט:

1. **Framework Preset:** Vercel אמור לזהות אוטומטית "Vite"
2. **Build Command:** `npm run build` (אמור להיות כבר)
3. **Output Directory:** `dist` (אמור להיות כבר)
4. **Install Command:** `npm install` (אמור להיות כבר)

### 3.3. הוסף משתני סביבה (חשוב!)

1. לחץ על **"Environment Variables"** (או "משתני סביבה")
2. הוסף שני משתנים:

   **משתנה 1:**
   - **Name:** `VITE_GOOGLE_SHEETS_API_KEY`
   - **Value:** המפתח שלך מ-Google Cloud Console
   - לחץ **"Add"**

   **משתנה 2:**
   - **Name:** `VITE_GOOGLE_APPS_SCRIPT_URL`
   - **Value:** ה-URL של Google Apps Script (אם כבר הגדרת)
   - לחץ **"Add"**

### 3.4. Deploy!

1. לחץ על **"Deploy"** (כחול למטה)
2. Vercel יתחיל לבנות את האתר
3. זה יקח 1-2 דקות

---

## שלב 4: קבלת הקישור

אחרי שה-Deploy מסתיים:

1. תראה מסך הצלחה
2. תקבל קישור לאתר (למשל: `your-project.vercel.app`)
3. לחץ על הקישור כדי לבדוק שהאתר עובד!

---

## ✅ סיכום מהיר

1. ✅ `git init` + `git add .` + `git commit`
2. ✅ צור repository ב-GitHub
3. ✅ `git push` ל-GitHub
4. ✅ ב-Vercel: לחץ "Install" (GitHub) או הדבק URL
5. ✅ הוסף משתני סביבה
6. ✅ לחץ "Deploy"
7. ✅ קבל קישור!

---

## ⚠️ הערות חשובות

- **אל תעלה** את קובץ `.env` ל-Git (הוא כבר ב-`.gitignore`)
- **הוסף** את משתני הסביבה ב-Vercel (לא בקוד)
- **אם אין לך** את ה-API KEY עדיין, תוכל להוסיף אותו אחר כך ב-Settings

---

**בהצלחה! 🎉**

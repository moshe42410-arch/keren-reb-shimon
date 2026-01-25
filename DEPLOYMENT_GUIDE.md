# מדריך העלאה לאוויר (Deployment Guide)

מדריך מפורט להעלאת האתר לאוויר עם Vercel או Netlify.

## 📋 דרישות מקדימות

1. חשבון GitHub/GitLab/Bitbucket (להעלאת הקוד)
2. חשבון Vercel או Netlify (חינמי)
3. משתני סביבה מוכנים

## 🔑 משתני סביבה נדרשים

לפני ההעלאה, ודא שיש לך את המשתנים הבאים:

```
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

---

## 🚀 אפשרות 1: Vercel (מומלץ - הכי קל)

### שלב 1: הכנת הקוד

1. ודא שהקוד שלך ב-GitHub/GitLab/Bitbucket
2. ודא שיש קובץ `.gitignore` שמתעלם מ-`.env` ו-`node_modules`

### שלב 2: יצירת חשבון Vercel

1. לך ל-[vercel.com](https://vercel.com)
2. לחץ על "Sign Up"
3. התחבר עם GitHub/GitLab/Bitbucket

### שלב 3: העלאת הפרויקט

1. לחץ על "Add New Project"
2. בחר את הפרויקט שלך מהרשימה
3. **הגדרות Build:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **הוסף משתני סביבה:**
   - לחץ על "Environment Variables"
   - הוסף כל משתנה:
     - `VITE_GOOGLE_SHEETS_API_KEY` = הערך שלך
     - `VITE_GOOGLE_APPS_SCRIPT_URL` = הערך שלך

5. לחץ על "Deploy"

### שלב 4: בדיקה

- Vercel יבנה את האתר אוטומטית
- תקבל קישור לאתר (למשל: `your-project.vercel.app`)
- כל עדכון ב-GitHub יעלה אוטומטית לאתר

---

## 🌐 אפשרות 2: Netlify

### שלב 1: הכנת הקוד

1. ודא שהקוד שלך ב-GitHub/GitLab/Bitbucket

### שלב 2: יצירת חשבון Netlify

1. לך ל-[netlify.com](https://www.netlify.com)
2. לחץ על "Sign up"
3. התחבר עם GitHub/GitLab/Bitbucket

### שלב 3: העלאת הפרויקט

1. לחץ על "Add new site" > "Import an existing project"
2. בחר את הפרויקט שלך
3. **הגדרות Build:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

4. **הוסף משתני סביבה:**
   - לחץ על "Site settings" > "Environment variables"
   - לחץ על "Add variable"
   - הוסף כל משתנה:
     - `VITE_GOOGLE_SHEETS_API_KEY` = הערך שלך
     - `VITE_GOOGLE_APPS_SCRIPT_URL` = הערך שלך

5. לחץ על "Deploy site"

### שלב 4: בדיקה

- Netlify יבנה את האתר אוטומטית
- תקבל קישור לאתר (למשל: `your-project.netlify.app`)

---

## 📦 אפשרות 3: Build מקומי והעלאה ידנית

אם אתה מעדיף להעלות ידנית:

### שלב 1: Build

```bash
npm run build
```

זה יוצר תיקייה `dist` עם הקבצים המוכנים.

### שלב 2: העלאה לשרת

1. העלה את כל התוכן מתיקיית `dist` לשרת שלך
2. ודא שהשרת משרת קבצים סטטיים
3. הוסף את משתני הסביבה בשרת (תלוי בפלטפורמה)

---

## ⚙️ הגדרת Vite לפרודקשן

אם אתה צריך להתאים את ה-build, ערוך את `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // שנה ל-'/your-project/' אם האתר בתת-תיקייה
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
```

---

## 🔒 אבטחה

**חשוב:**
- ❌ **אל תעלה** את קובץ `.env` ל-Git
- ✅ **השתמש** במשתני סביבה בפלטפורמת ה-Deployment
- ✅ **הגבל** את מפתח ה-API ב-Google Cloud Console רק ל-Google Sheets API

---

## 🐛 פתרון בעיות

### הבעיה: האתר לא נטען
- ודא שה-Build הצליח
- בדוק את ה-Console בדפדפן לשגיאות
- ודא שמשתני הסביבה הוגדרו נכון

### הבעיה: Google Sheets API לא עובד
- ודא שמפתח ה-API הוגדר נכון
- בדוק שהגיליון משותף או שהמפתח מוגבל נכון
- ודא שה-API מופעל ב-Google Cloud Console

### הבעיה: כתיבה ל-Google Sheets לא עובד
- ודא ש-`VITE_GOOGLE_APPS_SCRIPT_URL` הוגדר נכון
- בדוק שה-Google Apps Script מוגדר כ-Web App
- ודא שהגיליון משותף עם חשבון ה-Service Account

---

## 📝 הערות נוספות

1. **Custom Domain:** שתי הפלטפורמות מאפשרות הוספת דומיין מותאם אישית
2. **HTTPS:** כל האתרים מקבלים HTTPS אוטומטית
3. **Auto Deploy:** כל עדכון ב-Git יעלה אוטומטית לאתר

---

## ✅ בדיקה אחרונה לפני העלאה

- [ ] הקוד ב-Git
- [ ] `.env` ב-`.gitignore`
- [ ] `npm run build` עובד מקומית
- [ ] יש לך את כל משתני הסביבה
- [ ] Google Sheets API מופעל
- [ ] Google Apps Script מוגדר (אם נדרש)

---

**בהצלחה! 🎉**

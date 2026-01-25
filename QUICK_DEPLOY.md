# 🚀 העלאה מהירה לאוויר

## שלבים מהירים להעלאה ל-Vercel (הכי קל)

### 1. הכנת הקוד
```bash
# ודא שהקוד ב-Git
git add .
git commit -m "Ready for deployment"
git push
```

### 2. העלאה ל-Vercel

1. **לך ל-[vercel.com](https://vercel.com)** והתחבר עם GitHub
2. **לחץ "Add New Project"**
3. **בחר את הפרויקט שלך**
4. **הוסף משתני סביבה:**
   - `VITE_GOOGLE_SHEETS_API_KEY` = המפתח שלך
   - `VITE_GOOGLE_APPS_SCRIPT_URL` = ה-URL של Google Apps Script
5. **לחץ "Deploy"**

✅ **זהו! האתר יעלה תוך דקות!**

---

## בדיקה מקומית לפני העלאה

```bash
# Build מקומי
npm run build

# בדיקה מקומית
npm run preview
```

אם הכל עובד, אתה מוכן להעלאה!

---

## משתני סביבה נדרשים

לפני ההעלאה, ודא שיש לך:

1. **VITE_GOOGLE_SHEETS_API_KEY** - מפתח API מ-Google Cloud Console
2. **VITE_GOOGLE_APPS_SCRIPT_URL** - URL של Google Apps Script (אם משתמש)

---

## קישורים שימושיים

- [Vercel](https://vercel.com) - פלטפורמת העלאה מומלצת
- [Netlify](https://www.netlify.com) - אלטרנטיבה
- [Google Cloud Console](https://console.cloud.google.com) - לניהול API keys

---

**💡 טיפ:** Vercel מתחבר אוטומטית ל-GitHub ומעדכן את האתר בכל commit!

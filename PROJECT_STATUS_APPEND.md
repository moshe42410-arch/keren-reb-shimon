---

## סיכום מהיר למפתח חדש

### מה צריך לדעת:
1. **המערכת משתמשת ב-localStorage** - כל הנתונים נשמרים בדפדפן
2. **נורמליזציה חשובה** - תמיד להשתמש ב-`normalizeIdentifier` לפני השוואות
3. **פורמט תאריכים** - DD/MM/YYYY (ישראלי)
4. **תמיכות ממתינות** - עם `pendingApproval: true` ו-`category: "ממתין לאישור"`
5. **קטגוריות** - רק מהרשימה ב"ניהול קטגוריות"

### קבצים קריטיים לעריכה:
- `src/components/maorot/SupportsManagementTab.jsx` - ניהול תמיכות
- `src/components/maorot/CategoriesManagementTab.jsx` - ניהול קטגוריות
- `src/pages/SupportFormPage.jsx` - טופס חיצוני
- `src/utils/maorotUtils.js` - פונקציות עזר
- `src/services/maorotStorage.js` - אחסון נתונים

### תהליך עבודה מומלץ:
1. קרא את המדריך המלא
2. הרץ `npm install` ו-`npm run dev`
3. בדוק את הקוד ב-`src/components/maorot/`
4. בדוק את הנתונים ב-localStorage (DevTools → Application → Local Storage)
5. בדוק שגיאות ב-Console (F12)

---

**המדריך מוכן להעברה לצ'אט חדש! 🚀**

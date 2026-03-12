# מדריך מלא - פרויקט ניהול תמיכות מאורות

## סקירה כללית
פרויקט לניהול תמיכות, אלפון נתמכים, והפקת קבצים חודשיים. המערכת כוללת מספר לשוניות לניהול נתונים, סינון, עריכה, וטופס חיצוני להוספת תמיכות.

---

## מבנה הפרויקט

### קבצים ראשיים
- `src/pages/MaorotPage.jsx` - עמוד ראשי עם לשוניות
- `src/components/maorot/` - קומפוננטות של לשוניות מאורות
- `src/services/maorotStorage.js` - אחסון נתונים ב-localStorage
- `src/utils/maorotUtils.js` - פונקציות עזר

### לשוניות קיימות
1. **העלאת נתונים** (`ReturnUploadTab.jsx`) - העלאת קבצי Excel (חודשי/שנתי)
2. **לוח תנועות** (`MovementsBoardTab.jsx`) - הצגת תנועות עם סינון ועריכה
3. **אלפון נתמכים** (`SupportedDirectoryTab.jsx`) - ניהול רשימת נתמכים
4. **ניהול תמיכות** (`SupportsManagementTab.jsx`) - ניהול תמיכות עם עריכה
5. **מחולל תמיכות** (`SupportsGeneratorTab.jsx`) - יצירת קבצים חודשיים
6. **ניהול קטגוריות** (`CategoriesManagementTab.jsx`) - ניהול מסגרות וקטגוריות

---

## תכונות שהוספו/תוקנו

### 1. לשונית "ניהול תמיכות" (`SupportsManagementTab.jsx`)

#### תכונות שהוספו:
- ✅ **כותרות קבועות** - כותרות סטנדרטיות תמיד זמינות גם ללא טעינת קובץ
- ✅ **יצירת תמיכה ידנית** - אפשרות ליצור תמיכה גם לפני טעינת קובץ מפורט
- ✅ **שינוי סכום** - כתיבה ישירה (לא רק חיצים), עם אישור ב-onBlur
- ✅ **דיאלוג אישור שינוי** - מופיע רק כשעוזבים את השדה (onBlur), לא ב-onChange
- ✅ **סינון תמיכות ללא קטגוריה** - כפתור סינון
- ✅ **סינון תמיכות ללא מסגרת** - כפתור סינון
- ✅ **Autocomplete לקטגוריות ומסגרות** - הצעות אוטומטיות מהקטגוריות ב"ניהול קטגוריות"
- ✅ **כפתורי אישור/דחייה למנהל** - רק למנהל, לתמיכות עם קטגוריה "ממתין לאישור"

#### לוגיקה חשובה:
- ערכים זמניים (`tempValues`) - שמירת ערכים לפני אישור
- `handleCellBlur` - פותח חלון אישור רק כשעוזבים את השדה
- `getTempValue` / `setTempValue` - ניהול ערכים זמניים

#### קבצים שנוצרו/שונו:
- `src/components/maorot/SupportsManagementTab.jsx` - עודכן עם כל התכונות

---

### 2. לשונית "ניהול קטגוריות" (`CategoriesManagementTab.jsx`)

#### תכונות:
- ✅ טבלה עם 2 עמודות: "מסגרת" ו"קטגוריה"
- ✅ העלאה מקובץ Excel (עם בדיקת עמודות)
- ✅ הוספה ידנית של קטגוריות
- ✅ מחיקה של קטגוריות (בחירה מרובה + כפתור מחיקה)
- ✅ דיאלוג אישור למחיקה

#### אחסון:
- הקטגוריות נשמרות ב-`maorotData.categories` (מערך של `{id, frame, category}`)

#### קבצים שנוצרו:
- `src/components/maorot/CategoriesManagementTab.jsx` - קומפוננטה חדשה

---

### 3. טופס חיצוני (`SupportFormPage.jsx`)

#### תכונות:
- ✅ טופס ללא אימות - נגיש לכל אחד
- ✅ קישור: `/support-form`
- ✅ שאיבת נתונים מהאלפון - לפי ת.ז / מספר ספק כולל / מספר ספק מאורות
- ✅ יצירת תמיכה עם קטגוריה "ממתין לאישור"
- ✅ יצירת שורה ב-`returnFileRows` (לוח תנועות) עם קטגוריה "ממתין לאישור"

#### לוגיקה חשובה:
- `directoryLookup` - מחפש גם לפי ערך מנורמל וגם לפי ערך מקורי
- `getDirectoryEntry` - מחפש באלפון לפי מספר זהות/ספק
- `handleChange` - ממלא אוטומטית שדות מהאלפון כשמזינים מספר זהות/ספק
- `handleSubmit` - יוצר גם תמיכה וגם שורה ב-returnFileRows

#### קבצים שנוצרו:
- `src/pages/SupportFormPage.jsx` - עמוד טופס חדש
- `src/App.jsx` - נוסף route: `/support-form`

---

### 4. תיקונים כלליים

#### נורמליזציה של מספרי זהות:
- ✅ `normalizeIdentifier` - מסיר אפסים מובילים ותווים לא-מספריים
- ✅ שימוש בכל המערכת - `excelParser.js`, `syncService.js`, `maorotUtils.js`

#### פורמט תאריכים:
- ✅ `formatDateDisplay` - מזהה פורמט DD/MM/YYYY ומטפל בו נכון
- ✅ `buildReturnFileRowsYearly` - יוצר תאריכים בפורמט `01/MM/YYYY`

#### קריאת קבצי Excel:
- ✅ `readSpreadsheetFile` - שיפור טיפול בקבצים עם בעיות XML
- ✅ הודעות שגיאה ברורות יותר

---

## מבנה נתונים

### `maorotData` (ב-localStorage, מפתח: `maorot_data_v1`):
```javascript
{
  directoryEntries: [], // אלפון נתמכים
  supports: [], // תמיכות
  supportsHeaders: [], // כותרות תמיכות
  supportsColumnMapping: {}, // מיפוי עמודות
  returnFileRows: [], // שורות ללוח תנועות
  categories: [], // [{id, frame, category}]
  // ... נתונים נוספים
}
```

### מבנה תמיכה:
```javascript
{
  id: string,
  idNumber: string,
  name: string,
  amount: string,
  supportType: string,
  status: string,
  pendingApproval: boolean, // true אם ממתין לאישור
  rawRow: [], // שורה מקורית
  rawData: {}, // נתונים ממופים
  // ...
}
```

### מבנה שורה ב-returnFileRows:
```javascript
{
  idNumber: string,
  generalSupplierNumber: string,
  maorotSupplierNumber: string,
  name: string,
  date: string, // DD/MM/YYYY
  amount: number,
  pendingApproval: boolean, // true אם ממתין לאישור
  category: string, // "ממתין לאישור" או אחר
  // ...
}
```

---

## פונקציות עזר חשובות (`maorotUtils.js`)

### `normalizeIdentifier(value)`
- מסיר תווים לא-מספריים
- מסיר אפסים מובילים
- דוגמה: "000123456" → "123456"

### `normalizeString(value)`
- מנקה ומסיר רווחים

### `formatDateDisplay(value)`
- מזהה פורמט DD/MM/YYYY ומטפל בו נכון
- מחזיר תאריך בפורמט `DD/MM/YYYY`

### `buildReturnFileRowsYearly(rawData, year)`
- מפרסר קובץ שנתי עם עמודות חודשיות
- יוצר שורה לכל חודש עם סכום > 0
- תאריך: `01/MM/YYYY`

### `buildSupportEntryFromRow(headers, row, columnMapping)`
- בונה תמיכה משורה

---

## בעיות שתוקנו

### 1. בעיית תאריכים
**בעיה:** תאריכים הוצגו כ-MM/DD/YYYY במקום DD/MM/YYYY
**תיקון:** עודכן `formatDateDisplay` לזהות פורמט ישראלי

### 2. בעיית ID normalization
**בעיה:** מספרי זהות עם אפסים מובילים לא סונכרנו
**תיקון:** `normalizeIdentifier` מסיר אפסים מובילים בכל המערכת

### 3. בעיית Excel parsing
**בעיה:** שגיאת "Unknown Namespace" בקבצים מסוימים
**תיקון:** הוספת אופציות ל-`XLSX.read` והודעות שגיאה ברורות

### 4. בעיית חלון אישור
**בעיה:** חלון אישור קפץ ב-onChange במקום onBlur
**תיקון:** שימוש ב-`tempValues` ו-`handleCellBlur`

### 5. בעיית שאיבת נתונים מהאלפון
**בעיה:** הטופס לא שאב נתונים נכונים לפי ת.ז/ספק
**תיקון:** שיפור `directoryLookup` ו-`getDirectoryEntry` לחפש גם לפי ערך מנורמל וגם מקורי

### 6. בעיית יצירת שורות בלוח תנועות
**בעיה:** הטופס לא יצר שורות ב-returnFileRows
**תיקון:** הוספת יצירת שורה ב-`handleSubmit` עם `pendingApproval: true`

---

## הגדרות Vercel

### `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**חשוב:** לאחר שינויים ב-`vercel.json`, צריך לעשות commit ו-push ל-GitHub כדי ש-Vercel יבצע redeploy.

---

## הוראות להמשך עבודה

### אם צריך להוסיף תכונות חדשות:

1. **להוסיף לשונית חדשה:**
   - צור קומפוננטה ב-`src/components/maorot/`
   - הוסף ל-`tabs` ב-`MaorotPage.jsx`
   - הוסף route ב-`MaorotPage.jsx`

2. **להוסיף נתונים חדשים:**
   - עדכן `defaultData` ב-`maorotStorage.js`
   - עדכן `loadMaorotData` ו-`saveMaorotData`

3. **להוסיף פונקציות עזר:**
   - הוסף ל-`maorotUtils.js`

### אם יש בעיות:

1. **בעיית routing ב-Vercel:**
   - בדוק `vercel.json`
   - ודא שיש `rewrites` ל-`/index.html`

2. **בעיית נתונים לא מסונכרנים:**
   - בדוק `maorotStorage.js`
   - ודא ש-`saveMaorotData` נקרא אחרי כל שינוי

3. **בעיית שאיבת נתונים מהאלפון:**
   - בדוק `normalizeIdentifier` - צריך להסיר אפסים מובילים
   - בדוק `directoryLookup` - צריך לכלול גם ערכים מנורמלים וגם מקוריים

---

## קבצים שנוצרו/שונו

### קבצים חדשים:
1. `src/pages/SupportFormPage.jsx` - טופס חיצוני
2. `src/components/maorot/CategoriesManagementTab.jsx` - ניהול קטגוריות

### קבצים שעודכנו:
1. `src/components/maorot/SupportsManagementTab.jsx` - כל התכונות החדשות
2. `src/services/maorotStorage.js` - הוספת `categories`
3. `src/utils/maorotUtils.js` - תיקון `formatDateDisplay`, `normalizeIdentifier`
4. `src/pages/MaorotPage.jsx` - הוספת לשונית "ניהול קטגוריות"
5. `src/App.jsx` - הוספת route `/support-form`
6. `vercel.json` - תיקון routing

---

## נקודות חשובות לזכור

1. **נורמליזציה של ID:** תמיד להשתמש ב-`normalizeIdentifier` לפני השוואות
2. **פורמט תאריכים:** DD/MM/YYYY (ישראלי)
3. **ערכים זמניים:** ב"ניהול תמיכות", שינויים נשמרים זמנית עד אישור
4. **קטגוריות:** רק מהרשימה ב"ניהול קטגוריות" (עם autocomplete)
5. **תמיכות ממתינות:** עם `pendingApproval: true` ו-`category: "ממתין לאישור"`
6. **שורות ממתינות:** ב-`returnFileRows` עם `pendingApproval: true`

---

## בדיקות מומלצות

1. ✅ יצירת תמיכה ידנית לפני טעינת קובץ
2. ✅ שאיבת נתונים מהאלפון לפי ת.ז/ספק
3. ✅ יצירת שורה ב"לוח תנועות" מהטופס החיצוני
4. ✅ אישור/דחייה של תמיכות ממתינות (מנהל בלבד)
5. ✅ Autocomplete בקטגוריות ומסגרות
6. ✅ חלון אישור שינוי רק ב-onBlur
7. ✅ סינון תמיכות ללא קטגוריה/מסגרת

---

## הערות טכניות

- **React Router:** גרסה 7.12.0
- **Material-UI:** גרסה 5.14.20
- **XLSX:** גרסה 0.18.5
- **אחסון:** localStorage (מפתח: `maorot_data_v1`)
- **Build:** Vite
- **Deployment:** Vercel

---

## Routes במערכת

### Routes ציבוריים (ללא אימות):
- `/login` - עמוד התחברות
- `/support-form` - טופס חיצוני להוספת תמיכות (ללא אימות)

### Routes מוגנים (דורש התחברות):
- `/charity/upload` - העלאת נתונים
- `/charity/summaries` - סיכומים
- `/charity/reports` - דוחות
- `/charity/id-extraction` - חילוץ מספרי זהות
- `/charity/funds-management` - ניהול קרנות
- `/charity/users` - ניהול משתמשים (מנהל בלבד)
- `/maorot` - עמוד מאורות (עם לשוניות)
- `/summaries` - סיכומים מאוחדים

### Routes בתוך `/maorot` (לשוניות):
1. `return-upload` - העלאת נתונים
2. `movements-board` - לוח תנועות
3. `directory` - אלפון נתמכים
4. `supports` - ניהול תמיכות
5. `categories` - ניהול קטגוריות
6. `generator` - מחולל תמיכות

---

## הוראות הרצה

### התקנת תלותיות:
```bash
npm install
```

### הרצה בפיתוח:
```bash
npm run dev
```
האפליקציה תרוץ על `http://localhost:5173`

### בנייה לייצור:
```bash
npm run build
```
הקבצים יבנו לתיקייה `dist/`

### תצוגה מקדימה של build:
```bash
npm run preview
```

---

## מבנה קבצים מלא

```
src/
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.jsx
│   │   └── AdminRoute.jsx
│   ├── charity/
│   │   ├── ReportsTab.jsx
│   │   └── SummariesTab.jsx
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   └── TopNavigation.jsx
│   ├── maorot/
│   │   ├── CategoriesManagementTab.jsx ⭐ חדש
│   │   ├── MaorotSidebar.jsx
│   │   ├── MovementsBoardTab.jsx
│   │   ├── ReturnUploadTab.jsx
│   │   ├── SupportedDirectoryTab.jsx
│   │   ├── SupportsGeneratorTab.jsx
│   │   └── SupportsManagementTab.jsx ⭐ עודכן
│   ├── ConflictResolutionModal.jsx
│   ├── FileUploader.jsx
│   ├── MaorotFeature.jsx
│   └── SummaryTabs.jsx
├── context/
│   ├── AuthContext.jsx
│   └── DataContext.jsx
├── pages/
│   ├── AdminUsersPage.jsx
│   ├── FundsManagementPage.jsx
│   ├── IDExtractionPage.jsx
│   ├── LoginPage.jsx
│   ├── MaorotPage.jsx ⭐ עודכן
│   ├── ReportsPage.jsx
│   ├── SummariesPage.jsx
│   ├── SupportFormPage.jsx ⭐ חדש
│   ├── UploadPage.jsx
│   └── UnifiedSummariesPage.jsx
├── services/
│   ├── excelParser.js
│   ├── exportUtils.js
│   ├── googleSheets.js
│   ├── maorotStorage.js ⭐ עודכן
│   ├── storageService.js
│   ├── summaryService.js
│   └── syncService.js
├── utils/
│   ├── dateFormatter.js
│   ├── debugExcel.js
│   └── maorotUtils.js ⭐ עודכן
├── App.jsx ⭐ עודכן
├── index.css
└── main.jsx

vercel.json ⭐ עודכן
```

**⭐ = קבצים שנוצרו/עודכנו לאחרונה**

---

## תלותיות (Dependencies)

### תלותיות ראשיות:
- `react` (^18.2.0) - ספריית React
- `react-dom` (^18.2.0) - React DOM
- `react-router-dom` (^7.12.0) - ניתוב
- `@mui/material` (^5.14.20) - Material-UI
- `@mui/icons-material` (^5.14.19) - אייקונים
- `xlsx` (^0.18.5) - קריאת קבצי Excel
- `axios` (^1.6.2) - בקשות HTTP

### תלותיות פיתוח:
- `vite` (^5.0.0) - Build tool
- `tailwindcss` (^4.1.18) - CSS framework
- `@vitejs/plugin-react` (^4.2.0) - Vite plugin ל-React

---

## אימות והרשאות

### AuthContext:
- `isAuthenticated` - האם המשתמש מחובר
- `currentUser` - פרטי המשתמש הנוכחי
- `isAdmin` - האם המשתמש מנהל

### ProtectedRoute:
- דורש התחברות
- מפנה ל-`/login` אם לא מחובר

### AdminRoute:
- דורש התחברות + הרשאות מנהל
- מפנה ל-`/login` אם לא מחובר או לא מנהל

---

## אחסון נתונים

### localStorage:
- **מפתח:** `maorot_data_v1`
- **פורמט:** JSON
- **תוכן:** כל נתוני מאורות (directoryEntries, supports, categories, וכו')

### פונקציות:
- `loadMaorotData()` - טוען נתונים מ-localStorage
- `saveMaorotData(data)` - שומר נתונים ל-localStorage

---

## קישורים חשובים

- **טופס חיצוני:** `/support-form`
- **ניהול תמיכות:** `/maorot` → לשונית "ניהול תמיכות"
- **ניהול קטגוריות:** `/maorot` → לשונית "ניהול קטגוריות"
- **לוח תנועות:** `/maorot` → לשונית "לוח תנועות"
- **אלפון נתמכים:** `/maorot` → לשונית "אלפון נתמכים"

---

## פתרון בעיות נפוצות

### 1. שגיאת "Cannot read property of undefined"
- **סיבה:** ניסיון לגשת לנתונים לפני שהם נטענו
- **פתרון:** בדוק שיש `useEffect` שטוען נתונים, או בדוק null/undefined

### 2. נתונים לא נשמרים
- **סיבה:** `saveMaorotData` לא נקרא אחרי שינוי
- **פתרון:** ודא שקוראים ל-`saveMaorotData` אחרי כל עדכון של `maorotData`

### 3. שגיאת routing ב-Vercel
- **סיבה:** `vercel.json` לא מוגדר נכון
- **פתרון:** ודא שיש `rewrites` ל-`/index.html` ב-`vercel.json`

### 4. Autocomplete לא עובד
- **סיבה:** `categories` ריק או לא נטען
- **פתרון:** ודא ש-`maorotData.categories` נטען מ-localStorage

### 5. שאיבת נתונים מהאלפון לא עובדת
- **סיבה:** `normalizeIdentifier` לא מסיר אפסים מובילים
- **פתרון:** ודא ש-`normalizeIdentifier` נקרא לפני חיפוש באלפון

---

## הערות נוספות

### כותרות ברירת מחדל (`defaultHeaders`):
כאשר אין קובץ נטען, המערכת משתמשת בכותרות ברירת מחדל:
- מ.ז / ת.ז
- שם
- סכום
- מס' ספק כולל
- מס' ספק מאורות
- קטגוריה
- מסגרת
- וכו'

### תמיכות ממתינות:
- קטגוריה: `"ממתין לאישור"`
- `pendingApproval: true`
- מופיעות עם כפתורי "אישור"/"דחייה" למנהל בלבד
- לאחר אישור, `pendingApproval` משתנה ל-`false` והקטגוריה מתעדכנת

### Autocomplete:
- משתמש ב-Material-UI `Autocomplete`
- `freeSolo: true` - מאפשר הקלדה חופשית
- הצעות מהרשימה ב-`maorotData.categories`
- נפרד לקטגוריות ולמסגרות

---

**תאריך עדכון אחרון:** 2026-01-31
**גרסה:** 1.0
**מצב:** ✅ כל התכונות הושלמו
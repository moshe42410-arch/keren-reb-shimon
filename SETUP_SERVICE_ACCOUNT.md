# מדריך הגדרת Service Account לכתיבה לגוגל שיטס

## ⚠️ בעיית 401 Unauthorized

כשמנסים לכתוב לגוגל שיטס, נדרש **OAuth2** או **Service Account**. 
API Key לבד מספיק רק לקריאה, לא לכתיבה.

---

## 🎯 פתרון מומלץ: Google Apps Script Web App

זה הפתרון הכי פשוט ויעיל - לא צריך Service Account או backend!

### שלב 1: יצירת Google Apps Script

1. פתח את הגיליון שלך בגוגל שיטס
2. לחץ על **"Extensions" (תוספים) > "Apps Script"**
3. מחוק את כל הקוד הקיים והדבק את זה:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (!data.values || !Array.isArray(data.values)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid data format'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // מוסיף כל שורה
    data.values.forEach(row => {
      sheet.appendRow(row);
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rowsAdded: data.values.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// פונקציה לבדיקה
function doGet() {
  return ContentService.createTextOutput('Google Apps Script is working!');
}
```

4. לחץ על **"Save" (שמור)** - תן שם לפרויקט (למשל "Write to Sheets")

### שלב 2: Deploy כח Web App

1. לחץ על **"Deploy" (פרסום) > "New deployment" (פריסה חדשה)**
2. לחץ על האייקון ⚙️ ליד "Select type" ובחר **"Web app"**
3. הגדר:
   - **Description:** "Excel Analyzer Write API" (אופציונלי)
   - **Execute as:** Me (מבצע כמוני)
   - **Who has access:** Anyone (כל מי שיש לו את הקישור)
4. לחץ **"Deploy"**
5. **העתק את ה-Web App URL** שנוצר (נראה כך: `https://script.google.com/macros/s/.../exec`)

### שלב 3: הוספה לקוד

1. פתח את קובץ `.env` בתיקיית הפרויקט
2. הוסף את השורה הבאה:
   ```
   VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
   (החלף `YOUR_SCRIPT_ID` ב-URL שהעתקת)
3. שמור את הקובץ
4. הפעל מחדש את השרת (`npm run dev`)

**✅ זהו! עכשיו הכתיבה תעבוד!**

---

## 🔐 פתרון חלופי: Service Account (ללא Google Apps Script)

אם אתה מעדיף לא להשתמש ב-Google Apps Script:

### שלב 1: יצירת Service Account

1. לך ל-[Google Cloud Console](https://console.cloud.google.com/)
2. בחר את הפרויקט שלך (או צור חדש: **"New Project"**)
3. לך ל-**"APIs & Services" > "Credentials"**
4. לחץ **"Create Credentials" > "Service Account"**
5. הזן שם (למשל: "excel-analyzer-writer")
6. לחץ **"Create and Continue"**
7. דלג על "Grant this service account access to project" (אופציונלי)
8. לחץ **"Done"**

### שלב 2: יצירת מפתח JSON

1. לחץ על ה-Service Account שיצרת
2. לך לטאב **"Keys"**
3. לחץ **"Add Key" > "Create new key"**
4. בחר **"JSON"**
5. לחץ **"Create"** - הקובץ יורד אוטומטית למחשב שלך

### שלב 3: מיקום קובץ ה-JSON

**⚠️ חשוב: שים את קובץ ה-JSON בתיקייה הבאה:**

```
c:\Users\moshe\HI TEK\credentials\service-account.json
```

**יצירת התיקייה (אם לא קיימת):**
```bash
mkdir credentials
```

**שינוי שם הקובץ:**
- שנה את שם הקובץ שירד ל-`service-account.json`
- העבר אותו לתיקייה `credentials/`

**⚠️ אבטחה:** הקובץ כבר נוסף ל-`.gitignore` כך שלא יעלה ל-GitHub בטעות.

### שלב 4: שיתוף הגיליון עם Service Account

**זה השלב החשוב ביותר!**

1. פתח את קובץ ה-JSON (`credentials/service-account.json`)
2. מצא את השדה `"client_email"` - זה כתובת המייל של ה-Service Account
   
   למשל:
   ```json
   {
     "client_email": "excel-analyzer-writer@your-project-123456.iam.gserviceaccount.com"
   }
   ```
   
3. **העתק את כתובת המייל הזו**

4. פתח את הגיליון שלך בגוגל שיטס
5. לחץ על כפתור **"שיתוף" (Share)** בצד ימין למעלה
6. הדבק את כתובת המייל של ה-Service Account
7. **חשוב מאוד:** בחר **"Editor" (עורך)** בתור הרשאה (לא Viewer!)
8. לחץ **"שלח"** או **"Done"**

**✅ עכשיו ה-Service Account יכול לכתוב לגיליון!**

### שלב 5: יצירת Backend Proxy

**⚠️ הערה:** Service Account JSON לא יכול להיות נגיש ישירות מה-frontend בגלל אבטחה.
יש צורך ב-backend endpoint שיקרא את הקובץ ויחזיר access token.

**אם יש לך backend:**
- צור endpoint `/api/google-auth` שמשתמש ב-`google-auth-library` 
- הקוד יקרא את `credentials/service-account.json` ויחזיר access token

**אם אין לך backend:**
- **מומלץ להשתמש בפתרון Google Apps Script** (ראה למעלה)
- זה יותר פשוט ולא דורש backend

---

## 📋 סיכום - מה לעשות עכשיו?

### אפשרות 1: Google Apps Script (מומלץ ⭐)

1. ✅ צור Google Apps Script Web App (ראה למעלה)
2. ✅ העתק את ה-URL
3. ✅ הוסף ל-`.env`: `VITE_GOOGLE_APPS_SCRIPT_URL=your_url`
4. ✅ הפעל מחדש את השרת
5. ✅ סיימת!

### אפשרות 2: Service Account

1. ✅ צור Service Account ב-Google Cloud Console
2. ✅ הורד קובץ JSON
3. ✅ שים אותו ב-`credentials/service-account.json`
4. ✅ שתף את הגיליון עם `client_email` מה-JSON (Editor!)
5. ⚠️ צור backend endpoint או השתמש ב-Google Apps Script

---

## ❓ שאלות נפוצות

### איפה למצוא את `client_email`?
פתח את קובץ ה-JSON ותחפש את השדה `"client_email"`.

### למה אני צריך לשתף עם Service Account?
כי ה-Service Account הוא משתמש נפרד - הוא צריך הרשאות כמו כל משתמש אחר.

### למה "Editor" ולא "Viewer"?
כי "Viewer" יכול רק לקרוא, "Editor" יכול גם לכתוב.

### מה אם קיבלתי שגיאת 403?
- ודא שהגיליון משותף עם ה-Service Account
- ודא שהרשאה היא "Editor"
- נסה שוב

### מה אם קיבלתי שגיאת 401?
- ודא שהשתמשת ב-OAuth2 או Service Account (לא רק API Key)
- בדוק שה-Service Account JSON תקין

---

## 📞 עזרה נוספת

אם עדיין יש בעיות:
1. בדוק את הקונסול (F12) - מה השגיאה המדויקת?
2. ודא שהגיליון נגיש ושיתוף הוגדר נכון
3. נסה לפתוח את הגיליון בדפדפן אחר כדי לוודא שהוא נגיש

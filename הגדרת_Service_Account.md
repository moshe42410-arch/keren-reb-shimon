# הגדרת Service Account לכתיבה לגוגל שיטס

## בעיית 401 Unauthorized

כשמנסים לכתוב לגוגל שיטס, נדרש **OAuth2** או **Service Account** במקום API Key בלבד.
API Key מספיק רק לקריאה, אבל לכתיבה נדרש authentication מתקדם יותר.

---

## פתרון מומלץ: שימוש ב-Google Apps Script (הכי פשוט)

### שלב 1: יצירת Service Account

1. לך ל-[Google Cloud Console](https://console.cloud.google.com/)
2. בחר את הפרויקט שלך (או צור חדש)
3. לך ל-**"APIs & Services" > "Credentials"**
4. לחץ על **"Create Credentials" > "Service Account"**
5. הזן שם (למשל: "excel-analyzer-writer")
6. לחץ **"Create and Continue"**
7. דלג על שלב ה-Roles (אופציונלי)
8. לחץ **"Done"**

### שלב 2: יצירת מפתח JSON

1. לחץ על ה-Service Account שיצרת
2. לך לטאב **"Keys"**
3. לחץ על **"Add Key" > "Create new key"**
4. בחר **JSON**
5. לחץ **"Create"** - הקובץ יורד אוטומטית

### שלב 3: מיקום קובץ ה-JSON

**שים את קובץ ה-JSON בתיקייה הבאה:**
```
c:\Users\moshe\HI TEK\credentials\
```

צור את התיקייה אם היא לא קיימת:
```bash
mkdir credentials
```

**שם הקובץ:** נקה אותו ל-`service-account.json` (או כל שם שתרצה)

**⚠️ חשוב:** הוסף את התיקייה `credentials/` ל-`.gitignore` כדי שלא לפרסם את המפתח!

### שלב 4: שיתוף הגיליון עם Service Account

1. פתח את קובץ ה-JSON שיצרת
2. מצא את השדה `"client_email"` - זה כתובת המייל של ה-Service Account
   למשל: `excel-analyzer-writer@your-project.iam.gserviceaccount.com`
3. פתח את גוגל שיטס שלך
4. לחץ על כפתור **"שיתוף" (Share)**
5. הדבק את כתובת המייל של ה-Service Account
6. **חשוב:** בחר **"Editor" (עורך)** בתור הרשאה
7. לחץ **"שלח"** או **"Done"**

---

## פתרון חלופי: Google Apps Script Web App

אם השימוש ב-Service Account מורכב מדי, ניתן להשתמש ב-Google Apps Script:

### שלב 1: יצירת Google Apps Script

1. פתח את הגיליון בגוגל שיטס
2. לחץ על **"Extensions" > "Apps Script"**
3. הדבק את הקוד הבא:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // מוסיף שורות חדשות
    if (data.values && Array.isArray(data.values)) {
      data.values.forEach(row => {
        sheet.appendRow(row);
      });
    }
    
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
```

4. לחץ **"Deploy" > "New deployment"**
5. בחר **"Web app"** כסוג deployment
6. הגדר:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. לחץ **"Deploy"** והעתק את ה-URL שנוצר

### שלב 2: הוספת ה-URL לקוד

הוסף את ה-URL לקוד שלך והשתמש בו לכתיבה במקום Google Sheets API ישירות.

---

## הערות חשובות

1. **אבטחה:** לעולם אל תפרסם את קובץ ה-JSON ל-GitHub או למקומות ציבוריים
2. **גיבוי:** שמור עותק בטוח של קובץ ה-JSON במקום מאובטח
3. **הרשאות:** ודא שה-Service Account יש לו הרשאות "Editor" על הגיליון
4. **ביצועים:** Service Account מתאים יותר לכתיבה בתדירות גבוהה

---

## מה לעשות עכשיו?

1. צור Service Account ב-Google Cloud Console
2. הורד את קובץ ה-JSON
3. שים אותו בתיקייה `credentials/service-account.json`
4. שתף את הגיליון עם כתובת המייל של ה-Service Account (Editor)
5. עדכן את קובץ ה-`.env` או צור backend proxy שיקרא את הקובץ

---

## שאלות?

אם יש בעיות:
- ודא שהגיליון משותף עם ה-Service Account
- בדוק שהרשאה היא "Editor" ולא "Viewer"
- ודא שקובץ ה-JSON תקין ולא פגום

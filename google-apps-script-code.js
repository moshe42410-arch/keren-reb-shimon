/**
 * Google Apps Script Code לכתיבה לגוגל שיטס
 * 
 * הוראות:
 * 1. פתח את הגיליון שלך ב-Google Sheets
 * 2. לחץ על "Extensions" (תוספים) > "Apps Script"
 * 3. מחוק את כל הקוד הקיים והדבק את הקוד הזה
 * 4. לחץ על "Save" (שמור)
 * 5. לחץ על "Deploy" > "New deployment"
 * 6. בחר "Web app" כסוג deployment
 * 7. הגדר:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. לחץ "Deploy" והעתק את ה-URL שנוצר
 * 9. הוסף את ה-URL לקובץ .env: VITE_GOOGLE_APPS_SCRIPT_URL=your_url_here
 */

/**
 * פונקציה ראשית שמטפלת בכתיבת שורות חדשות
 * נקראת מ-frontend דרך POST request
 */
function doPost(e) {
  try {
    // פרסור הנתונים שנשלחו
    const data = JSON.parse(e.postData.contents);
    
    // קבלת הגיליון הנוכחי
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // בדיקה שהנתונים תקינים
    if (!data.values || !Array.isArray(data.values)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid data format: values must be an array'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.values.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No rows to add'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // מוסיף כל שורה לגיליון
    let rowsAdded = 0;
    data.values.forEach((row) => {
      if (Array.isArray(row)) {
        sheet.appendRow(row);
        rowsAdded++;
      }
    });
    
    // מחזיר תשובת הצלחה
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      rowsAdded: rowsAdded,
      message: `Successfully added ${rowsAdded} rows`
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // מחזיר שגיאה בפורמט JSON
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: error.message || 'Unknown error occurred'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * פונקציה לבדיקה - ניתן לקרוא דרך GET
 * נפתח בדפדפן: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Apps Script is working!',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

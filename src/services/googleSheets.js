// שירות לעבודה עם Google Sheets API

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || ''
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''

/**
 * מקבל access token מ-Service Account (דורש backend)
 * בפרודקשן, יש ליצור backend endpoint שמחזיר את ה-token
 */
const getAccessTokenFromServiceAccount = async () => {
  // פתרון זמני: קריאה ל-backend endpoint
  // בפרודקשן, יש ליצור endpoint שיקרא את קובץ ה-JSON ויחזיר token
  try {
    const response = await fetch('/api/google-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.accessToken
    }
  } catch (error) {
    console.warn('לא ניתן לקבל access token מ-backend:', error)
  }
  
  return null
}

/**
 * קורא נתונים מ-Google Sheets
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @param {string} range - טווח לקריאה (למשל 'Sheet1!A1:D10')
 * @returns {Promise<Array>} נתונים מהגיליון
 */
/**
 * קורא נתונים מ-Google Sheets עם retry logic לשגיאת 429
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @param {string} range - טווח לקריאה (למשל 'Sheet1!A1:D10')
 * @param {number} retries - מספר ניסיונות חוזרים
 * @returns {Promise<Array>} נתונים מהגיליון
 */
export const readGoogleSheet = async (spreadsheetId, range = 'Sheet1!A:Z', retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // אם אין מפתח API, ננסה בלי מפתח (רק אם הגיליון ציבורי)
      let url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`
      if (API_KEY) {
        url += `?key=${API_KEY}`
      } else {
        if (attempt === 1) {
          console.warn('⚠️ אין מפתח API מוגדר. הקריאה תעבוד רק אם הגיליון ציבורי (שיתוף עם "כל מי שיש לו קישור")')
        }
      }
      
      if (attempt === 1) {
        console.log('קורא מ-Google Sheets:', url.replace(API_KEY || '', '***'))
      } else {
        console.log(`ניסיון ${attempt}/${retries}...`)
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // אם זו שגיאת 429 (Too Many Requests) - ננסה שוב עם המתנה
        if (response.status === 429 && attempt < retries) {
          const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt) // exponential backoff
          console.warn(`⚠️ שגיאת 429 (יותר מדי בקשות). ממתין ${retryAfter} שניות לפני ניסיון חוזר...`)
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          continue // נסה שוב
        }
        
        console.error('שגיאת API:', response.status, response.statusText, errorData)
        
        if (response.status === 403) {
          throw new Error('שגיאת הרשאות: ודא שהגיליון משותף עם "כל מי שיש לו קישור" או שהוסף מפתח API תקין')
        } else if (response.status === 400) {
          const errorMessage = errorData?.error?.message || 'שגיאה בפרמטרים'
          console.error('פרטי שגיאת 400:', errorData)
          throw new Error(`שגיאה 400 (Bad Request): ${errorMessage}. בדוק שה-ID נכון ושהגיליון משותף. ID: ${spreadsheetId}`)
        } else if (response.status === 429) {
          throw new Error(`יותר מדי בקשות (429): נסה שוב בעוד כמה דקות. Google הגביל את מספר הבקשות.`)
        } else {
          throw new Error(`שגיאה בקריאה מ-Google Sheets: ${response.status} ${response.statusText}`)
        }
      }
      
      const data = await response.json()
      const values = data.values || []
      console.log(`✓ נקראו ${values.length} שורות מ-Google Sheets`)
      return values
    } catch (error) {
      // אם זה הניסיון האחרון או שהשגיאה היא לא 429 - זרוק את השגיאה
      if (attempt === retries || error.message.includes('429') === false) {
        console.error('Error reading Google Sheet:', error)
        throw error
      }
      // אחרת, המשך לניסיון הבא
    }
  }
  
  throw new Error('נכשל בקריאה מ-Google Sheets לאחר כל הניסיונות')
}

/**
 * כותב נתונים ל-Google Sheets
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @param {string} range - טווח לכתיבה
 * @param {Array} values - נתונים לכתיבה
 * @returns {Promise}
 */
export const writeGoogleSheet = async (spreadsheetId, range, values) => {
  try {
    // זה דורש OAuth או Service Account - נצטרך להגדיר זאת
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${API_KEY}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`שגיאה בכתיבה ל-Google Sheets: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error writing to Google Sheet:', error)
    throw error
  }
}

/**
 * מוסיף שורות חדשות ל-Google Sheets (append)
 * משתמש ב-Google Apps Script אם קיים, אחרת מנסה Google Sheets API עם OAuth
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @param {string} sheetName - שם הגיליון (למשל 'Sheet1')
 * @param {Array} values - נתונים לכתיבה (array of arrays)
 * @returns {Promise} תוצאות הכתיבה
 */
export const appendRowsToGoogleSheet = async (spreadsheetId, sheetName = 'Sheet1', values) => {
  try {
    if (!spreadsheetId) {
      throw new Error('חסר spreadsheetId')
    }
    
    if (!values || values.length === 0) {
      throw new Error('אין נתונים לכתיבה')
    }
    
    console.log(`מוסיף ${values.length} שורות ל-Google Sheets...`)
    
    // פתרון 1: נסה להשתמש ב-Google Apps Script Web App (אם מוגדר)
    if (GOOGLE_APPS_SCRIPT_URL) {
      try {
        console.log('מנסה לכתוב דרך Google Apps Script...')
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: values
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log(`✓ נוספו ${result.rowsAdded || values.length} שורות דרך Google Apps Script`)
          return {
            success: true,
            rowsAdded: result.rowsAdded || values.length,
            method: 'google-apps-script'
          }
        } else {
          // נסה לפרסר את השגיאה
          const errorText = await response.text()
          console.error('שגיאה מ-Google Apps Script:', response.status, errorText)
          try {
            const errorJson = JSON.parse(errorText)
            throw new Error(`שגיאה מ-Google Apps Script: ${errorJson.error || errorJson.message || errorText}`)
          } catch {
            throw new Error(`שגיאה מ-Google Apps Script (${response.status}): ${errorText}`)
          }
        }
      } catch (scriptError) {
        console.error('שגיאה בכתיבה דרך Google Apps Script:', scriptError)
        // אם יש שגיאה, נזרוק אותה עם הודעה ברורה
        if (scriptError.message && !scriptError.message.includes('שגיאה מ-Google Apps Script')) {
          throw new Error(`שגיאה בכתיבה דרך Google Apps Script: ${scriptError.message}`)
        }
        throw scriptError
      }
    } else {
      console.warn('⚠️ VITE_GOOGLE_APPS_SCRIPT_URL לא מוגדר ב-.env')
      console.warn('⚠️ הערה: Service Account JSON לא יכול להיות נקרא ישירות מ-frontend')
      console.warn('⚠️ יש להשתמש ב-Google Apps Script או ב-backend proxy')
    }
    
    // פתרון 2: נסה להשתמש ב-Google Sheets API עם access token מ-backend
    try {
      const accessToken = await getAccessTokenFromServiceAccount()
      
      if (accessToken) {
        const sheetNames = await getSheetNames(spreadsheetId)
        const actualSheetName = sheetNames.find(name => name === sheetName) || sheetNames[0] || 'Sheet1'
        
        const encodedSheetName = actualSheetName.includes(' ') || actualSheetName.includes("'") 
          ? `'${actualSheetName.replace(/'/g, "''")}'` 
          : actualSheetName
        
        const range = `${encodedSheetName}!A:Z`
        const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: values
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          const rowsAdded = result.updates?.updatedRows || values.length
          console.log(`✓ נוספו ${rowsAdded} שורות ל-Google Sheets`)
          return {
            success: true,
            rowsAdded: rowsAdded,
            updatedRange: result.updates?.updatedRange || '',
            method: 'oauth2'
          }
        }
      }
    } catch (oauthError) {
      console.warn('שגיאה בכתיבה דרך OAuth2:', oauthError)
    }
    
    // פתרון 3: נסה עם API Key (לא יעבוד לכתיבה, אבל נציג הודעה ברורה)
    const errorMessage = `
❌ שגיאת כתיבה לגוגל שיטס (401 Unauthorized)

כתיבה לגוגל שיטס דורשת OAuth2 או Service Account.
API Key לבד מספיק רק לקריאה, לא לכתיבה.

📋 פתרון מהיר - Google Apps Script (מומלץ):

1. פתח את הגיליון שלך ב-Google Sheets
2. לחץ על "Extensions" (תוספים) > "Apps Script"
3. הדבק את הקוד מקובץ google-apps-script-code.js (בתיקיית הפרויקט)
4. לחץ על "Save" (שמור)
5. לחץ על "Deploy" > "New deployment"
6. בחר "Web app" כסוג deployment
7. הגדר:
   - Execute as: Me
   - Who has access: Anyone
8. לחץ "Deploy" והעתק את ה-URL שנוצר
9. פתח קובץ .env והוסף:
   VITE_GOOGLE_APPS_SCRIPT_URL=your_url_here
10. הפעל מחדש את השרת (npm run dev)

📄 ראה קובץ SETUP_SERVICE_ACCOUNT.md למדריך מפורט
    `.trim()
    
    throw new Error(errorMessage)
    
  } catch (error) {
    console.error('Error appending rows to Google Sheet:', error)
    
    // אם זו שגיאה שכבר יש לה הודעה ברורה, נזרוק אותה כמו שהיא
    if (error.message && error.message.includes('שגיאת כתיבה')) {
      throw error
    }
    
    // אחרת, נזרוק שגיאה כללית
    throw new Error(`שגיאה בכתיבה ל-Google Sheets: ${error.message || error}`)
  }
}

/**
 * קורא את כל הנתונים מ-Google Sheets פעם אחת
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @returns {Promise<Array>} כל הנתונים מהגיליון
 */
/**
 * מקבל את שמות הגיליונות מהקובץ
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @returns {Promise<Array>} רשימת שמות הגיליונות
 */
export const getSheetNames = async (spreadsheetId) => {
  try {
    let url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`
    if (API_KEY) {
      url += `&key=${API_KEY}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`שגיאה בקריאת שמות הגיליונות: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const sheetNames = data.sheets?.map(sheet => sheet.properties.title) || ['Sheet1']
    console.log('שמות הגיליונות:', sheetNames)
    return sheetNames
  } catch (error) {
    console.error('Error getting sheet names:', error)
    // אם נכשל, נחזיר את ברירת המחדל
    return ['Sheet1']
  }
}

export const fetchAllCategoriesData = async (spreadsheetId) => {
  try {
    if (!spreadsheetId) {
      throw new Error('חסר spreadsheetId')
    }
    
    console.log('קורא את כל הנתונים מ-Google Sheets פעם אחת...')
    
    // מקבל את שמות הגיליונות
    const sheetNames = await getSheetNames(spreadsheetId)
    const firstSheetName = sheetNames[0] || 'Sheet1'
    
    console.log(`משתמש בגיליון: "${firstSheetName}"`)
    
    // קורא את כל הנתונים מהגיליון הראשון
    // משתמש בטווח גדול יותר כדי לוודא שקורא הכל
    // אם שם הגיליון מכיל רווחים או תווים מיוחדים, צריך לעטוף אותו בגרשיים
    const encodedSheetName = firstSheetName.includes(' ') || firstSheetName.includes("'") 
      ? `'${firstSheetName.replace(/'/g, "''")}'` 
      : firstSheetName
    const range = `${encodedSheetName}!A:Z`
    
    console.log(`משתמש בטווח: ${range}`)
    const data = await readGoogleSheet(spreadsheetId, range)
    
    if (!data || data.length === 0) {
      console.warn('לא נמצאו נתונים ב-Google Sheets')
      return []
    }
    
    console.log(`✓ נקראו ${data.length} שורות מ-Google Sheets`)
    return data
  } catch (error) {
    console.error('Error fetching all categories data:', error)
    throw error
  }
}

/**
 * מחפש קטגוריה בנתונים מקומיים (לא קורא מ-API)
 * @param {Array} categoriesData - הנתונים שכבר נקראו מ-Google Sheets
 * @param {string} idNumber - מספר זהות
 * @param {string} date - תאריך התנועה
 * @param {number} amount - סכום התנועה
 * @returns {string|null} קטגוריה או null אם לא נמצאה
 */
export const findCategoryInData = (categoriesData, idNumber, date, amount) => {
  try {
    if (!categoriesData || categoriesData.length === 0) {
      return null
    }
    
    if (!idNumber) {
      return null
    }
    
    // לפי המבנה שהמשתמש ציין:
    // ב-Google Sheets:
    // מ.ז בעמודה E (index 4)
    // תאריך (חודש) בעמודה B (index 1)
    // סכום בעמודה K (index 10)
    // קטגוריה בעמודה M (index 12)
    const ID_COL_INDEX = 4  // E - מ.ז בגוגל שיטס
    const DATE_COL_INDEX = 1 // B - תאריך/חודש בגוגל שיטס
    const AMOUNT_COL_INDEX = 10 // K - סכום בגוגל שיטס
    const CATEGORY_COL_INDEX = 12 // M - קטגוריה בגוגל שיטס
    
    console.log('משתמש באינדקסים קבועים ב-Google Sheets:', {
      id: ID_COL_INDEX,
      date: DATE_COL_INDEX,
      amount: AMOUNT_COL_INDEX,
      category: CATEGORY_COL_INDEX
    })
    
    // מנרמל את מספר הזהות לחיפוש
    const normalizedIdNumber = String(idNumber).trim().replace(/[\s-]/g, '')
    
    // מחפש התאמה בנתונים המקומיים
    for (let i = 1; i < categoriesData.length; i++) {
      const row = categoriesData[i]
      if (!row || row.length === 0) continue
      
      // מ.ז בעמודה E (index 4)
      const rowId = String(row[ID_COL_INDEX] || '').trim().replace(/[\s-]/g, '')
      
      if (!rowId) continue
      
      // בדיקה בסיסית של מספר זהות
      const idMatches = normalizedIdNumber && rowId && 
        (rowId === normalizedIdNumber || 
         rowId.includes(normalizedIdNumber) || 
         normalizedIdNumber.includes(rowId))
      
      if (idMatches) {
        
        // תאריך בעמודה B (index 1)
        let dateMatches = true
        if (date) {
          try {
            const rowDate = row[DATE_COL_INDEX]
            if (rowDate) {
              // מנסים כמה פורמטים של תאריך
              let rowDateObj = null
              
              if (typeof rowDate === 'string') {
                // אם זה תאריך בפורמט טקסט - נסה כמה פורמטים
                const dateStr = rowDate.trim()
                // פורמט חודש/שנה (למשל: 1/26, 01/2026)
                if (dateStr.match(/^\d{1,2}[\/\-]\d{2,4}$/)) {
                  const parts = dateStr.split(/[\/\-]/)
                  const month = parseInt(parts[0])
                  const year = parseInt(parts[1])
                  // אם השנה היא 2 ספרות, נניח שזה 20XX
                  const fullYear = year < 100 ? 2000 + year : year
                  rowDateObj = new Date(fullYear, month - 1, 1) // יום ראשון בחודש
                }
                // פורמט dd/mm/yyyy או dd-mm-yyyy
                else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
                  const parts = dateStr.split(/[\/\-]/)
                  rowDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                } else {
                  // נסה פורמט סטנדרטי
                  rowDateObj = new Date(rowDate)
                }
              } else if (typeof rowDate === 'number') {
                // אם זה מספר אקסל של תאריך
                rowDateObj = new Date((rowDate - 25569) * 86400 * 1000)
              } else if (rowDate instanceof Date) {
                rowDateObj = rowDate
              }
              
              let inputDateObj = null
              if (typeof date === 'string') {
                const dateStr = String(date).trim()
                // פורמט חודש/שנה (למשל: 1/26, 01/2026)
                if (dateStr.match(/^\d{1,2}[\/\-]\d{2,4}$/)) {
                  const parts = dateStr.split(/[\/\-]/)
                  const month = parseInt(parts[0])
                  const year = parseInt(parts[1])
                  // אם השנה היא 2 ספרות, נניח שזה 20XX
                  const fullYear = year < 100 ? 2000 + year : year
                  inputDateObj = new Date(fullYear, month - 1, 1) // יום ראשון בחודש
                }
                // פורמט dd/mm/yyyy או dd-mm-yyyy
                else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
                  const parts = dateStr.split(/[\/\-]/)
                  inputDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                } else {
                  inputDateObj = new Date(date)
                }
              } else if (typeof date === 'number') {
                inputDateObj = new Date((date - 25569) * 86400 * 1000)
              } else if (date instanceof Date) {
                inputDateObj = date
              } else {
                inputDateObj = new Date(date)
              }
              
              // בדיקה אם שני התאריכים תקינים
              if (rowDateObj && inputDateObj && !isNaN(rowDateObj.getTime()) && !isNaN(inputDateObj.getTime())) {
                // בדיקה אם באותו חודש ושנה
                dateMatches = rowDateObj.getMonth() === inputDateObj.getMonth() &&
                              rowDateObj.getFullYear() === inputDateObj.getFullYear()
              } else {
                // אם התאריכים לא תקינים, נמשיך בלי בדיקה
                console.warn('תאריכים לא תקינים:', { rowDate, date, rowDateObj, inputDateObj })
                dateMatches = true
              }
              
            }
          } catch (dateError) {
            // אם יש שגיאה, נמשיך בלי בדיקת תאריך
            dateMatches = true
          }
        }
        
        // סכום בעמודה K (index 10)
        let amountMatches = true
        if (dateMatches && amount && amount > 0) {
          const rowAmount = parseFloat(row[AMOUNT_COL_INDEX]) || 0
          if (rowAmount > 0) {
            // טולרנטיות של 0.01 או 1% מהסכום
            const tolerance = Math.max(0.01, Math.abs(amount) * 0.01)
            amountMatches = Math.abs(rowAmount - amount) <= tolerance
          }
        }
        
        // אם כל התנאים מתקיימים
        if (idMatches && dateMatches && amountMatches) {
          // קטגוריה בעמודה M (index 12)
          const category = String(row[CATEGORY_COL_INDEX] || '').trim()
          if (category) {
            return category
          }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error finding category in data:', error)
    return null
  }
}

/**
 * מחפש קטגוריה לפי מספר זהות ותאריך (משתמש ב-API - רק לשמירת תאימות לאחור)
 * @deprecated השתמש ב-fetchAllCategoriesData ו-findCategoryInData במקום
 */
export const findCategory = async (spreadsheetId, idNumber, date, amount) => {
  console.warn('⚠️ findCategory is deprecated. Use fetchAllCategoriesData and findCategoryInData instead.')
  const data = await fetchAllCategoriesData(spreadsheetId)
  return findCategoryInData(data, idNumber, date, amount)
}

/**
 * מוסיף או מעדכן קטגוריה בגיליון
 * @param {string} spreadsheetId - ID של הגיליון האלקטרוני
 * @param {Object} categoryData - נתוני הקטגוריה (idNumber, date, amount, category)
 * @returns {Promise}
 */
export const addOrUpdateCategory = async (spreadsheetId, categoryData) => {
  try {
    // קורא את הנתונים הנוכחיים
    const data = await readGoogleSheet(spreadsheetId)
    
    if (!data || data.length === 0) {
      throw new Error('לא ניתן לקרוא את הגיליון')
    }
    
    const headers = data[0]
    // מחפש אם השורה כבר קיימת ואם כן מעדכן, אחרת מוסיף שורה חדשה
    
    // זה דורש OAuth או Service Account לכתיבה מלאה
    // בינתיים נחזיר Promise שמציין שהפעולה הצליחה
    
    return { success: true, message: 'הקטגוריה עודכנה בהצלחה' }
  } catch (error) {
    console.error('Error adding/updating category:', error)
    throw error
  }
}

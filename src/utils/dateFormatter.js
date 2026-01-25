/**
 * פונקציות עזר לעיצוב תאריכים
 */

/**
 * ממיר תאריך מכל פורמט ל-Date object
 * @param {any} dateValue - תאריך (string, Date, number)
 * @returns {Date|null} Date object או null אם לא ניתן להמיר
 */
export const parseDate = (dateValue) => {
  if (!dateValue) return null
  
  try {
    // אם זה כבר Date object
    if (dateValue instanceof Date) {
      return !isNaN(dateValue.getTime()) ? dateValue : null
    }
    
    // אם זה מספר - יכול להיות מספר אקסל של תאריך
    if (typeof dateValue === 'number') {
      // מספר אקסל של תאריך הוא מספר ימים מ-1/1/1900
      // מספרים קטנים מ-100,000 נחשבים למספרי אקסל
      if (dateValue < 100000) {
        // המרה ממספר אקסל ל-Date
        // אקסל מחשב מ-1/1/1900, אבל יש הבדל של 2 ימים בגלל באג של 1900
        const excelEpoch = new Date(1899, 11, 30) // 30 בדצמבר 1899
        const date = new Date(excelEpoch.getTime() + dateValue * 86400 * 1000)
        return !isNaN(date.getTime()) ? date : null
      } else {
        // זה כנראה timestamp
        const date = new Date(dateValue)
        return !isNaN(date.getTime()) ? date : null
      }
    }
    
    // אם זה string
    if (typeof dateValue === 'string') {
      const dateStr = String(dateValue).trim()
      
      // פורמט DD/MM/YYYY או DD-MM-YYYY
      const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
      if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1])
        const month = parseInt(ddmmyyyyMatch[2])
        const year = parseInt(ddmmyyyyMatch[3])
        const date = new Date(year, month - 1, day)
        return !isNaN(date.getTime()) ? date : null
      }
      
      // פורמט MM/YYYY או MM-YYYY (חודש/שנה)
      const mmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{2,4})$/)
      if (mmyyyyMatch) {
        const month = parseInt(mmyyyyMatch[1])
        const year = parseInt(mmyyyyMatch[2])
        const fullYear = year < 100 ? 2000 + year : year
        const date = new Date(fullYear, month - 1, 1)
        return !isNaN(date.getTime()) ? date : null
      }
      
      // פורמט YYYY-MM-DD
      const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (yyyymmddMatch) {
        const year = parseInt(yyyymmddMatch[1])
        const month = parseInt(yyyymmddMatch[2])
        const day = parseInt(yyyymmddMatch[3])
        const date = new Date(year, month - 1, day)
        return !isNaN(date.getTime()) ? date : null
      }
      
      // נסה פורמט סטנדרטי
      const date = new Date(dateStr)
      return !isNaN(date.getTime()) ? date : null
    }
    
    return null
  } catch (error) {
    console.warn('Error parsing date:', error, dateValue)
    return null
  }
}

/**
 * ממיר תאריך לפורמט DD/MM/YYYY
 * @param {any} dateValue - תאריך (string, Date, number)
 * @returns {string} תאריך בפורמט DD/MM/YYYY או מחרוזת ריקה אם לא ניתן להמיר
 */
export const formatDateDDMMYYYY = (dateValue) => {
  const date = parseDate(dateValue)
  if (!date) return ''
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * ממיר תאריך לפורמט DD/MM/YYYY או מציג את הערך המקורי אם לא ניתן להמיר
 * @param {any} dateValue - תאריך (string, Date, number)
 * @returns {string} תאריך בפורמט DD/MM/YYYY או הערך המקורי
 */
export const formatDateSafe = (dateValue) => {
  if (!dateValue) return '-'
  
  const formatted = formatDateDDMMYYYY(dateValue)
  if (formatted) {
    return formatted
  }
  
  // אם לא ניתן להמיר, נחזיר את הערך המקורי
  return String(dateValue)
}

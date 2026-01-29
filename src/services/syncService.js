// שירות לסנכרון נתונים בין Excel ל-Google Sheets

/**
 * יוצר מזהה ייחודי (Unique Key) לשורה
 * המזהה מורכב מ: מספר זהות + סכום + חודש + מספר קרן
 * @param {string} idNumber - מספר זהות
 * @param {number} amount - סכום הפעולה
 * @param {string} month - חודש (YYYY-MM או פורמט אחר)
 * @param {string} fund - מספר קרן
 * @returns {string} מזהה ייחודי
 */
export const createUniqueKey = (idNumber, amount, month, fund) => {
  // מנרמל את הערכים - משתמש ב-normalizeIdentifier להסרת אפסים מובילים
  const normalizedId = normalizeIdentifier(idNumber)
  const normalizedAmount = parseFloat(amount || 0).toFixed(2)
  const normalizedMonth = String(month || '').trim()
  const normalizedFund = String(fund || '').trim()
  
  // יוצר מפתח ייחודי
  return `${normalizedId}_${normalizedAmount}_${normalizedMonth}_${normalizedFund}`.toLowerCase()
}

/**
 * מחלץ חודש מתאריך בפורמטים שונים
 * @param {any} dateValue - תאריך (string, Date, number)
 * @returns {string} חודש בפורמט YYYY-MM
 */
export const extractMonthFromDate = (dateValue) => {
  if (!dateValue) return ''
  
  try {
    let dateObj = null
    
    if (typeof dateValue === 'string') {
      const dateStr = String(dateValue).trim()
      
      // פורמט חודש/שנה או חודש.שנה (למשל: 1/26, 01/2026, 1.26)
      if (dateStr.match(/^\d{1,2}[\/\-\.,]\d{2,4}$/)) {
        const parts = dateStr.split(/[\/\-\.,]/)
        const month = parseInt(parts[0])
        const year = parseInt(parts[1])
        const fullYear = year < 100 ? 2000 + year : year
        dateObj = new Date(fullYear, month - 1, 1)
      }
      // פורמט YYYY-MM
      else if (dateStr.match(/^\d{4}-\d{2}$/)) {
        return dateStr
      }
      // פורמט dd/mm/yyyy או dd-mm-yyyy
      else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        const parts = dateStr.split(/[\/\-]/)
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      }
      // פורמט סטנדרטי
      else {
        dateObj = new Date(dateValue)
      }
    } else if (typeof dateValue === 'number') {
      // אם זה מספר אקסל של תאריך
      if (dateValue < 100000) {
        // זה כנראה מספר אקסל של תאריך (מספר ימים מ-1/1/1900)
        dateObj = new Date((dateValue - 25569) * 86400 * 1000)
      } else {
        // זה כנראה timestamp
        dateObj = new Date(dateValue)
      }
    } else if (dateValue instanceof Date) {
      dateObj = dateValue
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}`
    }
  } catch (error) {
    console.warn('Error extracting month from date:', error, dateValue)
  }
  
  return ''
}

/**
 * מסנכרן נתונים בין Excel ל-Google Sheets
 * @param {Object} excelData - נתונים מעובדים מ-Excel
 * @param {Array} googleSheetsData - נתונים מ-Google Sheets (raw array)
 * @param {string} fund - מספר קרן
 * @param {string} month - חודש (YYYY-MM)
 * @returns {Object} תוצאות הסנכרון
 */
export const syncData = (excelData, googleSheetsData, fund, month) => {
  if (!excelData || !excelData.rows) {
    return {
      syncedRows: [],
      missingInGoogleSheets: [],
      missingInExcel: [],
      categories: {},
    }
  }
  
  console.log('🔧 פרמטרי סנכרון:', { fund, month, excelRows: excelData.rows.length, gsRows: googleSheetsData.length })
  
  // אינדקסים ב-Google Sheets:
  // E (4) - מספר זהות
  // D (3) - שם
  // B (1) - חודש
  // K (10) - סכום
  // P (15) - מספר קרן
  // M (12) - קטגוריה
  const GS_ID_COL = 4  // E
  const GS_NAME_COL = 3  // D
  const GS_DATE_COL = 1  // B
  const GS_AMOUNT_COL = 10  // K
  const GS_FUND_COL = 15  // P
  const GS_CATEGORY_COL = 12  // M
  
  // מנרמל את הקרן - לוקח רק את המספר אם יש "5592 - בתי כלא"
  const normalizeFund = (fundValue) => {
    if (!fundValue) return ''
    const fundStr = String(fundValue).trim()
    // אם יש " - " אז לוקח את החלק הראשון
    const parts = fundStr.split(' - ')
    return parts[0].trim()
  }
  
  const normalizedFund = normalizeFund(fund)
  
  // יוצר מפה של נתוני Google Sheets לפי המזהה הייחודי
  const googleSheetsMap = new Map()
  
  // רשימה של שורות ללא מזהה מלא
  const rowsWithoutFullId = []
  
  // עובר על כל השורות בגוגל שיטס (משורה 1 - אחרי הכותרות)
  for (let i = 1; i < googleSheetsData.length; i++) {
    const row = googleSheetsData[i]
    if (!row || row.length === 0) continue
    
    const gsId = normalizeIdentifier(row[GS_ID_COL])
    const gsName = String(row[GS_NAME_COL] || '').trim()
    // לוקח את הערך המוחלט של הסכום (בגלל שגם בגוגל שיטס יכול להיות שלילי)
    // מנקה סמלי מטבע, פסיקים, ורווחים לפני המרה
    const gsAmountRaw = String(row[GS_AMOUNT_COL] || '').trim()
    const gsAmountClean = gsAmountRaw
      .replace(/₪|[$€£¥]|,/g, '') // מסיר סמלי מטבע ופסיקים
      .replace(/\s+/g, '') // מסיר רווחים
      .replace(/[()]/g, (match) => match === '(' ? '-' : '') // מטפל בסוגריים לסכומים שליליים
    const gsAmount = Math.abs(parseFloat(gsAmountClean) || 0)
    const gsMonth = extractMonthFromDate(row[GS_DATE_COL])
    const gsFundRaw = String(row[GS_FUND_COL] || '').trim()
    const gsFund = normalizeFund(gsFundRaw) // מנרמל את הקרן
    const gsCategory = String(row[GS_CATEGORY_COL] || '').trim()
    
    // לוגים לבדיקה
    if (gsId === '318957875') {
      console.log('📊 שורה בגוגל שיטס עם מ.ז 318957875:', {
        gsId,
        gsAmount,
        rawAmount: row[GS_AMOUNT_COL],
        gsAmountRaw,
        gsAmountClean,
        gsDate: row[GS_DATE_COL],
        gsMonth,
        gsFundRaw,
        gsFund,
        normalizedFund,
        fundMatch: gsFund === normalizedFund,
        gsCategory,
        rowIndex: i + 1
      })
    }
    
    // בודק אם חסר חלק מהמזהה (מ.ז, סכום, או קרן) - כל שורה שחסר בה מ.ז, סכום, או קרן
    const missingParts = []
    const hasMissingId = !gsId || gsId === ''
    const hasMissingAmount = !gsAmount || gsAmount === 0
    const hasMissingFund = !gsFundRaw || gsFundRaw === '' || !gsFund || gsFund === ''
    
    if (hasMissingId) {
      missingParts.push('מ.ז')
    }
    if (hasMissingAmount) {
      missingParts.push('סכום')
    }
    if (!gsMonth || gsMonth === '') {
      missingParts.push('תאריך')
    }
    if (hasMissingFund) {
      missingParts.push('קרן')
    }
    
    // אם חסר מ.ז, סכום, או קרן, נבדוק אם השורה שייכת לחודש ולקרן הנוכחיים ונשמור לרשימה נפרדת
    // (גם אם התאריך קיים, אם חסר מ.ז, סכום, או קרן - נכליל ברשימה זו)
    if (hasMissingId || hasMissingAmount || hasMissingFund) {
      // ממיר את החודש להשוואה
      let normalizedMonthForCompare = month || ''
      if (normalizedMonthForCompare) {
        if (normalizedMonthForCompare.match(/^\d{1,2}[\/]\d{4}$/)) {
          const parts = normalizedMonthForCompare.split('/')
          const monthPart = parts[0]
          const yearPart = parts[1]
          normalizedMonthForCompare = `${yearPart}-${monthPart.padStart(2, '0')}`
        }
        normalizedMonthForCompare = normalizedMonthForCompare.toLowerCase().trim()
      }
      
      // gsMonth כבר מנורמל ל-YYYY-MM, לא צריך לעשות extractMonthFromDate שוב
      const normalizedRowMonth = (gsMonth || '').toLowerCase().trim()
      const rowFundRaw = String(gsFundRaw || '').trim()
      const rowFundNormalized = normalizeFund(rowFundRaw)
      const rowFund = rowFundRaw.toLowerCase()
      const rowFundNormalizedLower = rowFundNormalized.toLowerCase()
      const normalizedFundLower = normalizedFund.toLowerCase().trim()
      
      // בודק אם השורה שייכת לחודש ולקרן הנוכחיים
      // אם אין חודש שנבחר - נכלול את כל השורות
      // אם יש חודש שנבחר - בודק התאמה (או אם אין תאריך בשורה, נכלול)
      const monthMatches = !normalizedMonthForCompare || 
                          !normalizedRowMonth || 
                          normalizedRowMonth === normalizedMonthForCompare
      
      // אם אין קרן שנבחרה - נכלול את כל השורות
      // אם יש קרן שנבחרה - בודק התאמה (גם עם וגם בלי נירמול, או אם אין קרן בשורה)
      const fundMatches = !normalizedFundLower || 
                         !rowFund || 
                         rowFund === normalizedFundLower ||
                         rowFundNormalizedLower === normalizedFundLower
      
      if (monthMatches && fundMatches) {
        rowsWithoutFullId.push({
          rowIndex: i + 1,
          id: gsId || '',
          name: gsName || '',
          amount: gsAmount || 0,
          month: row[GS_DATE_COL] || '',
          fund: gsFundRaw || '',
          category: gsCategory || '',
          missingParts: missingParts.join(', '),
          rawRow: row,
        })
      }
      continue // מדלג על שורה זו ולא מוסיף למפה
    }
    
    // בודק אם הקרן תואמת - אם אין קרן שנבחרה, לוקח את כל השורות
    // אם יש קרן, בודק התאמה (גם עם וגם בלי נירמול)
    const fundMatches = !normalizedFund || 
                       gsFund === normalizedFund || 
                       gsFundRaw === normalizedFund ||
                       gsFundRaw === fund ||
                       gsFund === fund
    
    // לוגים לבדיקה
    if (gsId === '318957875') {
      console.log('🔍 בדיקת קרן לשורה 318957875:', {
        gsId,
        gsAmount,
        gsFundRaw,
        gsFund,
        normalizedFund,
        fund,
        fundMatches,
        willAdd: gsId && gsAmount > 0 && fundMatches
      })
    }
    
    if (gsId && gsAmount > 0) {
      // אם הקרן לא תואמת, עדיין נוסיף למפה אבל נסמן את זה
      // (אולי הקרן בגוגל שיטס ריקה או שונה)
      if (!fundMatches && normalizedFund) {
        // רק אם יש קרן ספציפית שנבחרה, נדלג על שורות שלא תואמות
        // אבל נדלוג רק אם הקרן בגוגל שיטס לא ריקה ולא תואמת כלל
        if (gsFundRaw && gsFundRaw !== '' && gsFund && gsFund !== '') {
          // הקרן לא תואמת - נדלג
          if (gsId === '318957875') {
            console.log('⏭️ מדלג על שורה - קרן לא תואמת:', {
              gsFundRaw,
              gsFund,
              normalizedFund,
              fund
            })
          }
          continue
        }
      }
      
      const uniqueKey = createUniqueKey(gsId, gsAmount, gsMonth, gsFund)
      
      if (gsId === '318957875') {
        console.log('🔑 מפתח ייחודי שנוצר:', uniqueKey)
      }
      
      googleSheetsMap.set(uniqueKey, {
        rowIndex: i + 1, // שורה בגוגל שיטס (1-based)
        id: gsId,
        name: gsName,
        amount: gsAmount,
        month: gsMonth,
        fund: gsFund,
        category: gsCategory,
        rawRow: row,
      })
    }
  }
  
  // פונקציה עזר לבדיקה אם שורה היא סוג תנועה "תמיכה"
  const isSupportRow = (row) => {
    if (!row || !row.type) return false
    const typeStr = String(row.type).trim().toLowerCase()
    return typeStr.includes('תמיכות') || 
           typeStr.includes('תמיכה') || 
           typeStr.includes('support') ||
           typeStr === 'תמיכות'
  }
  
  // עובר על כל השורות ב-Excel ומסנכרן
  const syncedRows = []
  const missingInGoogleSheets = []
  const categories = {}
  
  // ספירת שורות לסטטיסטיקה
  let totalSupportRows = 0
  let matchedSupportRows = 0
  
  excelData.rows.forEach((excelRow) => {
    const excelId = normalizeIdentifier(excelRow.idNumber)
    // לוקח את הערך המוחלט של הסכום (בגלל שאקסל יכול להיות שלילי)
    const excelAmount = Math.abs(parseFloat(excelRow.amount) || 0)
    const excelDate = excelRow.date || ''
    const excelMonth = extractMonthFromDate(excelDate) || month
    
    // לוגים לבדיקה
    if (excelId === '318957875') {
      console.log('🔍 בדיקת שורה עם מ.ז 318957875:', {
        excelId,
        excelAmount,
        excelDate,
        excelMonth,
        fund,
        excelRowAmount: excelRow.amount,
        type: excelRow.type
      })
    }
    
    // יוצר מזהה ייחודי לשורה ב-Excel (עם סכום חיובי וקרן מנורמלת)
    // מנסה גם עם קרן ריקה אם הקרן בגוגל שיטס ריקה
    const uniqueKey = createUniqueKey(excelId, excelAmount, excelMonth, normalizedFund)
    const uniqueKeyWithEmptyFund = createUniqueKey(excelId, excelAmount, excelMonth, '')
    
    if (excelId === '318957875') {
      console.log('🔑 מפתחות שנוצרו מאקסל:', {
        withFund: uniqueKey,
        withEmptyFund: uniqueKeyWithEmptyFund,
        mapSize: googleSheetsMap.size,
        hasKey1: googleSheetsMap.has(uniqueKey),
        hasKey2: googleSheetsMap.has(uniqueKeyWithEmptyFund)
      })
    }
    
    // בודק אם השורה קיימת ב-Google Sheets - מנסה גם עם קרן ריקה
    let googleSheetRow = googleSheetsMap.get(uniqueKey) || googleSheetsMap.get(uniqueKeyWithEmptyFund)
    
    // אם לא נמצאה התאמה מלאה, ננסה לחפש גם עם וריאציות קטנות בסכום (טולרנטיות)
    if (!googleSheetRow && excelAmount > 0) {
      // טולרנטיות של 0.01 או 1% מהסכום
      const tolerance = Math.max(0.01, Math.abs(excelAmount) * 0.01)
      
      // חיפוש בהתאמה עם טולרנטיות
      for (const [key, value] of googleSheetsMap.entries()) {
        const keyParts = key.split('_')
        if (keyParts.length >= 4) {
          const keyId = keyParts[0]
          const keyAmount = parseFloat(keyParts[1])
          const keyMonth = keyParts[2]
          const keyFund = keyParts[3]
          
          // בודק התאמה עם טולרנטיות בסכום (גם עם ערך מוחלט)
          const amountMatch = Math.abs(keyAmount - excelAmount) <= tolerance
          
          if (excelId === '318957875') {
            console.log('🔍 בדיקת התאמה:', {
              keyId,
              keyAmount,
              excelAmount,
              amountMatch,
              keyMonth,
              excelMonth,
              monthMatch: keyMonth === excelMonth.toLowerCase(),
              keyFund,
              fund,
              fundMatch: keyFund === fund.toLowerCase()
            })
          }
          
          // בודק התאמה גם עם קרן ריקה או ללא קרן
          const fundMatchesInSearch = !keyFund || keyFund === '' || 
                                     keyFund === normalizedFund.toLowerCase() || 
                                     keyFund === fund.toLowerCase() ||
                                     !normalizedFund
          
          if (keyId === excelId.toLowerCase() && 
              keyMonth === excelMonth.toLowerCase() && 
              fundMatchesInSearch &&
              amountMatch) {
            googleSheetRow = value
            // מסיר את המפתח הישן ומוסיף את החדש
            googleSheetsMap.delete(key)
            googleSheetsMap.set(uniqueKey, value)
            
            if (excelId === '318957875') {
              console.log('✅ נמצאה התאמה!', { uniqueKey, googleSheetRow })
            }
            break
          }
        }
      }
    }
    
    if (googleSheetRow) {
      // השורה קיימת - מסנכרן את הקטגוריה
      const isSupport = isSupportRow(excelRow)
      if (isSupport) {
        totalSupportRows++
        matchedSupportRows++
      }
      
      syncedRows.push({
        ...excelRow,
        uniqueKey,
        category: googleSheetRow.category,
        synced: true,
      })
      
      if (googleSheetRow.category) {
        categories[uniqueKey] = googleSheetRow.category
      }
      
      // מסיר מהמפה כי כבר מצאנו התאמה
      googleSheetsMap.delete(uniqueKey)
    } else {
      // השורה לא קיימת ב-Google Sheets
      // **רק עבור שורות תמיכה נציג בממשק ההשוואה**
      if (isSupportRow(excelRow)) {
        totalSupportRows++
        missingInGoogleSheets.push({
          ...excelRow,
          uniqueKey,
          category: null,
          synced: false,
        })
      }
    }
  })
  
  console.log('סטטיסטיקות סנכרון תמיכה:', {
    totalSupportRows,
    matchedSupportRows,
    missingInGoogleSheets: missingInGoogleSheets.length,
    totalExcelRows: excelData.rows.length,
    totalGSRows: googleSheetsData.length - 1, // -1 כי השורה הראשונה היא כותרות
    fund,
    month,
    googleSheetsMapSize: googleSheetsMap.size
  })
  
  // לוגים נוספים לבדיקה
  if (missingInGoogleSheets.length > 0) {
    console.log('📋 דוגמאות לשורות חסרות:', missingInGoogleSheets.slice(0, 3).map(row => ({
      id: row.idNumber,
      amount: row.amount,
      date: row.date,
      month: extractMonthFromDate(row.date) || month,
      fund,
      uniqueKey: row.uniqueKey
    })))
  }
  
  // לוגים על שורות בגוגל שיטס
  const gsSampleKeys = Array.from(googleSheetsMap.keys()).slice(0, 3)
  console.log('📋 דוגמאות למפתחות בגוגל שיטס:', gsSampleKeys)
  
  // כל השורות שנשארו ב-googleSheetsMap הן שורות שקיימות ב-Google Sheets
  // אבל לא ב-Excel (בחודש ובקרן הרלוונטיים)
  const missingInExcel = []
  
  // ממיר את החודש שהמשתמש הזין לפורמט YYYY-MM להשוואה
  // תמיכה גם ב-MM/YYYY וגם ב-YYYY-MM
  let normalizedMonthForCompare = month || ''
  if (normalizedMonthForCompare) {
    // אם זה בפורמט MM/YYYY, נמיר ל-YYYY-MM
    if (normalizedMonthForCompare.match(/^\d{1,2}[\/]\d{4}$/)) {
      const parts = normalizedMonthForCompare.split('/')
      const monthPart = parts[0]
      const yearPart = parts[1]
      normalizedMonthForCompare = `${yearPart}-${monthPart.padStart(2, '0')}`
    }
    // אם זה כבר בפורמט YYYY-MM, נשאיר אותו
    normalizedMonthForCompare = normalizedMonthForCompare.toLowerCase().trim()
  }
  
  const normalizedFundForMissing = normalizeFund(fund) || ''
  
  console.log('🔍 בדיקת missingInExcel:', {
    inputMonth: month,
    normalizedMonthForCompare,
    normalizedFundForMissing,
    googleSheetsMapSize: googleSheetsMap.size
  })
  
  googleSheetsMap.forEach((value, key) => {
    // בודק אם השורה שייכת לחודש ולקרן הנוכחיים
    const rowMonth = extractMonthFromDate(value.month) || value.month
    const normalizedRowMonth = (rowMonth || '').toLowerCase().trim()
    const rowFundRaw = String(value.fund || '').trim()
    const rowFundNormalized = normalizeFund(rowFundRaw)
    const rowFund = rowFundRaw.toLowerCase()
    const rowFundNormalizedLower = rowFundNormalized.toLowerCase()
    const normalizedFundLower = normalizedFundForMissing.toLowerCase().trim()
    
    // השוואה של חודש - בודק התאמה מדויקת
    // אם אין חודש שנבחר, נכלול את כל השורות
    const monthMatches = !normalizedMonthForCompare || 
                        normalizedRowMonth === normalizedMonthForCompare ||
                        (!normalizedMonthForCompare && !normalizedRowMonth) // אם שניהם ריקים
    
    // השוואה גמישה של קרן - בודק התאמה מדויקת (גם עם וגם בלי נירמול)
    // רק שורות עם קרן תואמת (או ללא קרן שנבחרה) - שורות ללא קרן לא נכללות ב-missingInExcel
    const fundMatches = !normalizedFundLower || 
                       (rowFund && rowFund !== '' && (rowFund === normalizedFundLower || rowFundNormalizedLower === normalizedFundLower))
    
    if (monthMatches && fundMatches) {
      missingInExcel.push({
        uniqueKey: key,
        id: value.id,
        name: value.name || '',
        amount: value.amount,
        month: value.month,
        fund: value.fund,
        category: value.category,
        rowIndex: value.rowIndex,
        rawRow: value.rawRow,
      })
    }
  })
  
  console.log('סטטיסטיקות missingInExcel:', {
    missingInExcel: missingInExcel.length,
    inputMonth: month,
    normalizedMonthForCompare,
    fund: normalizedFundForMissing,
    remainingGSRows: googleSheetsMap.size
  })
  
  console.log('סטטיסטיקות rowsWithoutFullId:', {
    rowsWithoutFullId: rowsWithoutFullId.length,
    examples: rowsWithoutFullId.slice(0, 3)
  })
  
  return {
    syncedRows,
    missingInGoogleSheets,
    missingInExcel,
    rowsWithoutFullId,
    categories,
  }
}

/**
 * בודק אם קובץ זהה כבר קיים במערכת
 * @param {Array} currentExcelData - הנתונים הנוכחיים מה-Excel
 * @param {string} fund - מספר קרן
 * @param {string} month - חודש
 * @returns {Promise<Object>} תוצאות הבדיקה
 */
export const checkForDuplicateFile = async (currentExcelData, fund, month) => {
  // כאן נוכל להוסיף בדיקה מול localStorage או שרת
  // לעת עתה נחזיר false
  return {
    isDuplicate: false,
    existingData: null,
    differences: null,
  }
}

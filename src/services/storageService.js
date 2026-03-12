// שירות לשמירת נתונים ב-localStorage

const STORAGE_KEY = 'excel_analyzer_data'

const normalizeFundStorageValue = (fundValue) => {
  const str = String(fundValue || '').trim()
  if (!str) return ''
  return str.split(' - ')[0].trim()
}

const normalizeMonthStorageValue = (monthValue) => {
  const str = String(monthValue || '').trim()
  if (!str) return ''

  if (str.includes('/')) {
    const [month, year] = str.split('/')
    if (month && year) {
      return `${year.trim()}-${month.trim().padStart(2, '0')}`
    }
  }

  if (str.includes('-')) {
    const [year, month] = str.split('-')
    if (year && month) {
      return `${year.trim()}-${month.trim().padStart(2, '0')}`
    }
  }

  return str
}

/**
 * שומר נתונים ב-localStorage
 * @param {string} key - מפתח לשמירה
 * @param {any} data - נתונים לשמירה
 */
export const saveToStorage = (key, data) => {
  try {
    const existingData = getFromStorage(STORAGE_KEY) || {}
    existingData[key] = {
      data,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData))
    console.log(`נשמר ב-localStorage: ${key}`)
  } catch (error) {
    console.error('Error saving to storage:', error)
    throw error
  }
}

/**
 * קורא נתונים מ-localStorage
 * @param {string} key - מפתח לקריאה
 * @returns {any} הנתונים או null
 */
export const getFromStorage = (key = STORAGE_KEY) => {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error reading from storage:', error)
    return null
  }
}

// רשימת קרנות קבועה
const DEFAULT_FUNDS = [
  { value: '5270', label: '5270 - רבי שמעון' },
  { value: '5407', label: '5407 - לחם וחלב' },
  { value: '5508', label: '5508 - הכנסת כלה' },
  { value: '5590', label: '5590 - תמיכות לשבת' },
  { value: '5591', label: '5591 - מתן בסתר' },
  { value: '5592', label: '5592 - בתי כלא' },
]

/**
 * מקבל את כל הקרנות (קבועות + מ-localStorage)
 * @returns {Array<Object>} רשימת קרנות עם value ו-label
 */
export const getAllFundsWithLabels = () => {
  // קריאת metadata דרך STORAGE_KEY
  const allData = getFromStorage(STORAGE_KEY)
  const metadata = allData && allData['metadata'] ? allData['metadata'].data : null
  const savedFunds = metadata && metadata.funds ? metadata.funds : []
  const deletedFunds = metadata && metadata.deletedFunds ? metadata.deletedFunds : []
  const fundUpdates = metadata && metadata.fundUpdates ? metadata.fundUpdates : {}
  
  // מיזוג קרנות קבועות עם קרנות שנשמרו
  // מסנן קרנות קבועות שנמחקו ומעדכן שמות של קרנות שעודכנו
  const allFunds = DEFAULT_FUNDS.filter(fund => {
    return !deletedFunds.includes(fund.value) && !deletedFunds.includes(fund.label)
  }).map(fund => {
    // אם יש עדכון לשם הקרן, מעדכן את ה-label
    const updatedName = fundUpdates[fund.value] || fundUpdates[fund.label]
    if (updatedName) {
      return {
        value: fund.value,
        label: updatedName
      }
    }
    return fund
  })
  
  savedFunds.forEach(fund => {
    // בודק אם הקרן כבר קיימת ברשימה הקבועה או ברשימת הקרנות שנמחקו
    const fundStr = typeof fund === 'string' ? fund : (fund.value || fund.label || fund)
    if (!DEFAULT_FUNDS.find(f => f.value === fundStr || f.label === fundStr) && 
        !deletedFunds.includes(fundStr)) {
      allFunds.push({
        value: fundStr,
        label: fundStr
      })
    }
  })
  
  return allFunds
}

/**
 * מקבל את כל הקרנות (רק ערכים)
 * @returns {Array<string>}
 */
export const getAllFunds = () => {
  return getAllFundsWithLabels().map(f => f.value || f.label)
}

/**
 * שומר קרן חדשה
 * @param {string} fundName - שם הקרן החדשה
 */
export const saveNewFund = (fundName) => {
  if (!fundName || !fundName.trim()) {
    throw new Error('שם הקרן לא יכול להיות ריק')
  }
  
  const fundNameTrimmed = fundName.trim()
  
  // קריאת metadata דרך STORAGE_KEY
  const allData = getFromStorage(STORAGE_KEY) || {}
  const metadata = allData['metadata'] && allData['metadata'].data 
    ? { ...allData['metadata'].data } 
    : { funds: [], months: [] }
  
  // בודק אם הקרן היא קרן קבועה שנמחקה
  const deletedFunds = metadata.deletedFunds || []
  
  // מחפש את הקרן הקבועה התואמת (על פי value או label)
  const matchingDefaultFund = DEFAULT_FUNDS.find(f => 
    f.value === fundNameTrimmed || f.label === fundNameTrimmed
  )
  
  // אם הקרן היא קרן קבועה שנמחקה, אפשר להוסיף אותה מחדש על ידי הסרתה מרשימת המחיקות
  if (matchingDefaultFund) {
    const fundKeyToCheck = matchingDefaultFund.value
    const index = deletedFunds.indexOf(fundKeyToCheck)
    if (index > -1) {
      // הקרן נמחקה, מחזירים אותה על ידי הסרתה מרשימת המחיקות
      deletedFunds.splice(index, 1)
      metadata.deletedFunds = deletedFunds
      allData['metadata'] = {
        data: metadata,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
      
      console.log(`קרן "${fundNameTrimmed}" הוחזרה בהצלחה`)
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fundsUpdated'))
      }
      return // הקרן הוחזרה, אין צורך להוסיף אותה שוב
    }
  }
  
  // בודק אם הקרן כבר קיימת (ולא נמחקה)
  const fundExists = DEFAULT_FUNDS.find(f => 
    (f.value === fundNameTrimmed || f.label === fundNameTrimmed) &&
    !deletedFunds.includes(f.value)
  )
  
  if (fundExists) {
    throw new Error(`קרן "${fundNameTrimmed}" כבר קיימת (קרן קבועה)`)
  }
  
  if (metadata.funds && metadata.funds.includes(fundNameTrimmed)) {
    throw new Error(`קרן "${fundNameTrimmed}" כבר קיימת`)
  }
  
  // מוסיף את הקרן החדשה
  if (!metadata.funds) {
    metadata.funds = []
  }
  metadata.funds.push(fundNameTrimmed)
  
  // שומר את השינויים
  allData['metadata'] = {
    data: metadata,
    timestamp: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    console.log(`קרן חדשה נשמרה: ${fundNameTrimmed}`, 'metadata:', metadata)
    console.log('כל הנתונים ב-localStorage:', allData)
  } catch (error) {
    console.error('שגיאה בשמירת הקרן:', error)
    throw new Error(`שגיאה בשמירת הקרן: ${error.message}`)
  }
  
  // מפעיל event כדי לעדכן את כל הלשוניות
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fundsUpdated'))
  }
}

/**
 * מעדכן שם קרן
 * @param {string} oldFundName - שם הקרן הישן
 * @param {string} newFundName - שם הקרן החדש
 */
export const updateFund = (oldFundName, newFundName) => {
  if (!oldFundName || !newFundName || !newFundName.trim()) {
    throw new Error('שם הקרן לא יכול להיות ריק')
  }
  
  const oldFundNameTrimmed = oldFundName.trim()
  const newFundNameTrimmed = newFundName.trim()
  
  // קריאת metadata דרך STORAGE_KEY
  const allData = getFromStorage(STORAGE_KEY) || {}
  const metadata = allData['metadata'] && allData['metadata'].data 
    ? { ...allData['metadata'].data } 
    : { funds: [], months: [] }
  
  // בודק אם הקרן היא קרן קבועה
  const isDefault = DEFAULT_FUNDS.find(f => 
    f.value === oldFundNameTrimmed || f.label === oldFundNameTrimmed
  )
  
  if (isDefault) {
    // עבור קרנות קבועות, שומרים עדכון ב-metadata
    if (!metadata.fundUpdates) {
      metadata.fundUpdates = {}
    }
    metadata.fundUpdates[oldFundNameTrimmed] = newFundNameTrimmed
  } else {
    // עבור קרנות שהוספו ידנית, מעדכנים ישירות ברשימה
    if (!metadata.funds || !Array.isArray(metadata.funds)) {
      throw new Error('רשימת קרנות לא תקינה')
    }
    
    const index = metadata.funds.findIndex(fund => {
      const fundStr = typeof fund === 'string' ? fund : (fund.value || fund.label || fund)
      return fundStr === oldFundNameTrimmed || fundStr.trim() === oldFundNameTrimmed
    })
    
    if (index === -1) {
      throw new Error('קרן לא נמצאה')
    }
    
    // מעדכן את שם הקרן
    metadata.funds[index] = newFundNameTrimmed
  }
  
  // מעדכן את כל הנתונים הקיימים של הקרן הישנה
  Object.keys(allData).forEach(key => {
    if (key === 'metadata') return
    const [keyFund] = key.split('_')
    if (keyFund === oldFundNameTrimmed) {
      const newKey = key.replace(oldFundNameTrimmed, newFundNameTrimmed)
      allData[newKey] = allData[key]
      delete allData[key]
    }
  })
  
  // שומר את metadata המעודכן
  allData['metadata'] = {
    data: metadata,
    timestamp: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    console.log(`קרן עודכנה: ${oldFundNameTrimmed} -> ${newFundNameTrimmed}`)
  } catch (error) {
    console.error('שגיאה בעדכון הקרן:', error)
    throw new Error(`שגיאה בעדכון הקרן: ${error.message}`)
  }
  
  // מפעיל event כדי לעדכן את כל הלשוניות
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fundsUpdated'))
  }
}

/**
 * מוחק קרן
 * @param {string} fundName - שם הקרן למחיקה
 */
export const deleteFund = (fundName) => {
  if (!fundName) {
    throw new Error('שם הקרן לא יכול להיות ריק')
  }
  
  const fundNameTrimmed = fundName.trim()
  
  // קריאת metadata דרך STORAGE_KEY
  const allData = getFromStorage(STORAGE_KEY) || {}
  const metadata = allData['metadata'] && allData['metadata'].data 
    ? { ...allData['metadata'].data } 
    : { funds: [], months: [] }
  
  // אם הקרן היא קרן קבועה, מוסיפים אותה לרשימת קרנות שנמחקו
  // (שמירה ברשימה נפרדת כדי לא להציג אותן)
  if (!metadata.deletedFunds) {
    metadata.deletedFunds = []
  }
  
  const isDefault = DEFAULT_FUNDS.find(f => 
    f.value === fundNameTrimmed || f.label === fundNameTrimmed
  )
  
  if (isDefault) {
    // אם הקרן היא קרן קבועה, מוסיפים אותה לרשימת קרנות שנמחקו
    if (!metadata.deletedFunds.includes(fundNameTrimmed)) {
      metadata.deletedFunds.push(fundNameTrimmed)
    }
  } else {
    // אם הקרן היא קרן שהוספה ידנית, מוחקים אותה מהרשימה
    if (!metadata.funds || !Array.isArray(metadata.funds)) {
      throw new Error('רשימת קרנות לא תקינה')
    }
    
    const index = metadata.funds.findIndex(fund => {
      const fundStr = typeof fund === 'string' ? fund : (fund.value || fund.label || fund)
      return fundStr === fundNameTrimmed || fundStr.trim() === fundNameTrimmed
    })
    
    if (index === -1) {
      throw new Error(`קרן "${fundNameTrimmed}" לא נמצאה ברשימה`)
    }
    
    // מוחק את הקרן מהרשימה
    metadata.funds.splice(index, 1)
  }
  
  // שומר את השינויים
  allData['metadata'] = {
    data: metadata,
    timestamp: new Date().toISOString()
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    console.log(`קרן נמחקה: ${fundNameTrimmed}`, 'metadata לאחר מחיקה:', metadata)
  } catch (error) {
    console.error('שגיאה במחיקת הקרן:', error)
    throw new Error(`שגיאה במחיקת הקרן: ${error.message}`)
  }
  
  // מפעיל event כדי לעדכן את כל הלשוניות
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fundsUpdated'))
  }
}

/**
 * שומר נתוני Excel לפי קרן ותאריך
 * @param {string} fund - שם הקרן
 * @param {string} month - חודש (format: YYYY-MM)
 * @param {Object} excelData - נתוני האקסל
 */
export const saveExcelData = (fund, month, excelData) => {
  const key = `${fund}_${month}`

  const normalizedFund = normalizeFundStorageValue(fund)
  const normalizedMonth = normalizeMonthStorageValue(month)
  const existingData = getFromStorage(STORAGE_KEY) || {}

  Object.keys(existingData).forEach((existingKey) => {
    if (existingKey === 'metadata') return

    const [existingFund, existingMonth] = existingKey.split('_')
    if (
      normalizeFundStorageValue(existingFund) === normalizedFund &&
      normalizeMonthStorageValue(existingMonth) === normalizedMonth
    ) {
      delete existingData[existingKey]
    }
  })

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData))
  saveToStorage(key, excelData)
  // שומר גם רשימת כל הקרנות והחודשים
  const metadata = getFromStorage('metadata') || { funds: [], months: [] }
  if (!metadata.funds.includes(fund)) {
    metadata.funds.push(fund)
  }
  if (!metadata.months.includes(month)) {
    metadata.months.push(month)
  }
  saveToStorage('metadata', metadata)
}

/**
 * בודק אם קיימים נתונים עבור קרן וחודש
 * @param {string} fund - שם הקרן
 * @param {string} month - חודש (format: YYYY-MM)
 * @returns {boolean}
 */
export const hasExcelData = (fund, month) => {
  const key = `${fund}_${month}`
  const allData = getFromStorage(STORAGE_KEY)
  return allData && allData[key] !== undefined
}

/**
 * קורא נתוני Excel לפי קרן וחודש
 * @param {string} fund - שם הקרן
 * @param {string} month - חודש (format: YYYY-MM)
 * @returns {Object|null}
 */
export const getExcelData = (fund, month) => {
  const key = `${fund}_${month}`
  const allData = getFromStorage(STORAGE_KEY)
  return allData && allData[key] ? allData[key].data : null
}

/**
 * מקבל את כל החודשים
 * @returns {Array<string>}
 */
export const getAllMonths = () => {
  const metadata = getFromStorage('metadata')
  return metadata && metadata.months ? metadata.months : []
}

/**
 * מקבל נתונים לפי טווח תאריכים
 * @param {string} fund - שם הקרן (אופציונלי)
 * @param {Date} startDate - תאריך התחלה
 * @param {Date} endDate - תאריך סיום
 * @returns {Array<Object>}
 */
export const getDataByDateRange = (fund, startDate, endDate) => {
  const allData = getFromStorage(STORAGE_KEY)
  const resultsByMonth = new Map()
  
  if (!allData) return results

  const normalizedStartDate = startDate instanceof Date && !Number.isNaN(startDate.getTime())
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
    : null
  const normalizedEndDate = endDate instanceof Date && !Number.isNaN(endDate.getTime())
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
    : null
  const normalizedRequestedFund = normalizeFundStorageValue(fund)
  
  Object.keys(allData).forEach(key => {
    if (key === 'metadata') return
    
    const [keyFund, keyMonth] = key.split('_')
    if (normalizedRequestedFund && normalizeFundStorageValue(keyFund) !== normalizedRequestedFund) return
    
    let date = null
    // תמיכה בשני פורמטים: YYYY-MM או MM/YYYY
    if (keyMonth.includes('/')) {
      // פורמט MM/YYYY (למשל: 01/2026)
      const [month, year] = keyMonth.split('/')
      date = new Date(parseInt(year), parseInt(month) - 1, 1)
    } else if (keyMonth.includes('-')) {
      // פורמט YYYY-MM (למשל: 2026-01)
      const [year, month] = keyMonth.split('-')
      date = new Date(parseInt(year), parseInt(month) - 1, 1)
    } else {
      // נסה לפרסר כפורמט אחר
      console.warn('פורמט חודש לא מזוהה:', keyMonth)
      return
    }
    
    if (!date || Number.isNaN(date.getTime())) {
      return
    }

    const monthStartDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
    const monthEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

    const hasDateOverlap =
      (!normalizedStartDate || monthEndDate >= normalizedStartDate) &&
      (!normalizedEndDate || monthStartDate <= normalizedEndDate)

    if (hasDateOverlap) {
      const normalizedMonthKey = `${keyFund}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const currentTimestamp = new Date(allData[key]?.timestamp || 0).getTime() || 0
      const existingItem = resultsByMonth.get(normalizedMonthKey)
      const existingTimestamp = existingItem?.timestamp || 0

      if (!existingItem || currentTimestamp >= existingTimestamp) {
        resultsByMonth.set(normalizedMonthKey, {
          fund: keyFund,
          month: keyMonth,
          date,
          data: allData[key].data,
          timestamp: currentTimestamp
        })
      }
    }
  })
  
  return Array.from(resultsByMonth.values())
    .sort((a, b) => a.date - b.date)
    .map(({ timestamp, ...item }) => item)
}

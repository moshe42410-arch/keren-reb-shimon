// שירות לסיכומים ולטיפול בקטגוריות

import { getDataByDateRange } from './storageService'
import { fetchAllCategoriesData } from './googleSheets'
import { normalizeIdentifier } from '../utils/maorotUtils'
import { getRowGrossAmount, getRowOverheadAmount } from '../utils/movementAmounts'

/**
 * בודק אם סוג תנועה הוא תרומה
 */
export const isDonation = (type) => {
  if (!type) return false
  const typeStr = String(type).trim().toLowerCase()
  return typeStr.includes('תרומה') || typeStr.includes('donation') || typeStr === 'תרומות'
}

/**
 * בודק אם סוג תנועה הוא מלגה
 */
export const isScholarship = (type) => {
  if (!type) return false
  const typeStr = String(type).trim().toLowerCase()
  return typeStr.includes('מלגה') || typeStr.includes('scholarship') || typeStr === 'מלגות'
}

/**
 * בודק אם סוג תנועה הוא תקורה
 */
export const isOverhead = (type) => {
  if (!type) return false
  const typeStr = String(type).trim().toLowerCase()
  return typeStr.includes('תקורה') || typeStr.includes('overhead') || typeStr.includes('עמלה') || typeStr === 'תקורות'
}

export const isSupplierPayment = (type) => {
  if (!type) return false
  const typeStr = String(type).trim().toLowerCase()
  return typeStr.includes('תשלום ספקים') || typeStr.includes('ספקים')
}

/**
 * בודק אם סוג תנועה הוא תמיכה
 */
export const isSupport = (type) => {
  if (!type) return false
  const typeStr = String(type).trim().toLowerCase()
  return (
    typeStr.includes('תמיכות') ||
    typeStr.includes('תמיכה') ||
    typeStr.includes('support') ||
    typeStr === 'תמיכות'
  )
}

/**
 * מוצא את כל הקטגוריות התואמות מ-Google Sheets (עבור זיהוי קונפליקטים)
 * @param {Array} categoriesData - נתונים מ-Google Sheets
 * @param {string} idNumber - מספר זהות
 * @param {string} date - תאריך התנועה
 * @param {number} amount - סכום התנועה
 * @returns {Array<Object>} רשימת קטגוריות תואמות
 */
export const findAllMatchingCategories = (categoriesData, idNumber, date, amount) => {
  const matches = []
  
  if (!categoriesData || categoriesData.length === 0 || !idNumber) {
    return matches
  }
  
  const ID_COL_INDEX = 4  // E - מ.ז בגוגל שיטס
  const DATE_COL_INDEX = 1 // B - תאריך/חודש בגוגל שיטס
  const AMOUNT_COL_INDEX = 10 // K - סכום בגוגל שיטס
  const CATEGORY_COL_INDEX = 12 // M - קטגוריה בגוגל שיטס
  
  const { normalizeIdentifier } = require('../utils/maorotUtils')
  const normalizedIdNumber = normalizeIdentifier(idNumber)
  
  for (let i = 1; i < categoriesData.length; i++) {
    const row = categoriesData[i]
    if (!row || row.length === 0) continue
    
    const rowId = normalizeIdentifier(row[ID_COL_INDEX])
    if (!rowId) continue
    
    const idMatches = normalizedIdNumber && rowId && rowId === normalizedIdNumber
    
    if (!idMatches) continue
    
    // בדיקת תאריך
    let dateMatches = false
    if (date) {
      try {
        const rowDate = row[DATE_COL_INDEX]
        if (rowDate) {
          let rowDateObj = null
          if (typeof rowDate === 'string') {
            const dateStr = rowDate.trim()
            if (dateStr.match(/^\d{1,2}[\/\-]\d{2,4}$/)) {
              const parts = dateStr.split(/[\/\-]/)
              const month = parseInt(parts[0])
              const year = parseInt(parts[1])
              const fullYear = year < 100 ? 2000 + year : year
              rowDateObj = new Date(fullYear, month - 1, 1)
            } else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
              const parts = dateStr.split(/[\/\-]/)
              rowDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
            } else {
              rowDateObj = new Date(rowDate)
            }
          } else if (typeof rowDate === 'number') {
            rowDateObj = new Date((rowDate - 25569) * 86400 * 1000)
          } else if (rowDate instanceof Date) {
            rowDateObj = rowDate
          }
          
          let inputDateObj = null
          if (typeof date === 'string') {
            const dateStr = String(date).trim()
            if (dateStr.match(/^\d{1,2}[\/\-]\d{2,4}$/)) {
              const parts = dateStr.split(/[\/\-]/)
              const month = parseInt(parts[0])
              const year = parseInt(parts[1])
              const fullYear = year < 100 ? 2000 + year : year
              inputDateObj = new Date(fullYear, month - 1, 1)
            } else if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
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
          
          if (rowDateObj && inputDateObj && !isNaN(rowDateObj.getTime()) && !isNaN(inputDateObj.getTime())) {
            dateMatches = rowDateObj.getMonth() === inputDateObj.getMonth() &&
                          rowDateObj.getFullYear() === inputDateObj.getFullYear()
          }
        }
      } catch (dateError) {
        dateMatches = false
      }
    }
    
    // בדיקת סכום
    let amountMatches = false
    if (dateMatches && amount && amount > 0) {
      const rowAmount = parseFloat(row[AMOUNT_COL_INDEX]) || 0
      if (rowAmount > 0) {
        const tolerance = Math.max(0.01, Math.abs(amount) * 0.01)
        amountMatches = Math.abs(rowAmount - amount) <= tolerance
      }
    }
    
    if (idMatches && dateMatches && amountMatches) {
      const category = String(row[CATEGORY_COL_INDEX] || '').trim()
      if (category) {
        matches.push({
          category,
          rowIndex: i + 1,
          id: rowId,
          date: row[DATE_COL_INDEX],
          amount: parseFloat(row[AMOUNT_COL_INDEX]) || 0
        })
      }
    }
  }
  
  return matches
}

/**
 * מסכם נתונים לפי קרן, ארגון, סוג פעולה וקטגוריה
 * @param {string} fund - קרן (אופציונלי)
 * @param {Date} startDate - תאריך התחלה
 * @param {Date} endDate - תאריך סיום
 * @param {string} googleSheetsId - ID של Google Sheets (אופציונלי)
 * @returns {Promise<Object>} סיכום הנתונים
 */
export const summarizeByFundAndOrganization = async (fund, startDate, endDate, googleSheetsId = null) => {
  // תמיכה במערך של קרנות או קרן בודדת או null
  let data = []
  if (Array.isArray(fund) && fund.length > 0) {
    // אם זה מערך של קרנות, אוספים נתונים מכל הקרנות
    for (const singleFund of fund) {
      const fundData = getDataByDateRange(singleFund || null, startDate, endDate)
      data = data.concat(fundData)
    }
  } else {
    // אם זה string או null, עובדים כמו קודם
    data = getDataByDateRange(fund || null, startDate, endDate)
  }
  
  console.log('📊 סיכום - נתונים שנקראו:', { 
    dataLength: data.length, 
    fund, 
    startDate: startDate?.toISOString(), 
    endDate: endDate?.toISOString() 
  })
  
  const summary = {
    byFund: {}, // { [fund]: { donations, scholarships, overheads, supports, supportsByCategory, totalAmount } }
    byOrganization: {
      'מרכז הצדקה': {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supportsByCategory: {},
        totalAmount: 0
      },
      'מאורות': {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supportsByCategory: {},
        totalAmount: 0
      }
    },
    byFundAndOrganization: {}, // { [fund]: { [org]: { donations, scholarships, overheads, supports, supportsByCategory } } }
    byCategory: {}, // { [category]: amount }
    byTransactionType: {
      donations: 0,
      scholarships: 0,
      overheads: 0,
      supports: 0,
      supplierPayments: 0
    },
    total: {
      donations: 0,
      scholarships: 0,
      overheads: 0,
      supports: 0,
      supplierPayments: 0,
      supportsByCategory: {},
      totalAmount: 0
    },
    conflicts: [] // קונפליקטים בקטגוריות
  }
  
  // טוען נתוני קטגוריות מ-Google Sheets אם יש
  let categoriesData = null
  if (googleSheetsId) {
    try {
      categoriesData = await fetchAllCategoriesData(googleSheetsId)
    } catch (error) {
      console.warn('שגיאה בטעינת קטגוריות מ-Google Sheets:', error)
    }
  }
  
  // עובר על כל הנתונים
  for (const item of data) {
    const organization = item.data?.organization || 'מרכז הצדקה' // ברירת מחדל
    const processedData = item.data?.processedData
    const fundKey = item.fund
    
    console.log('📊 עיבוד נתונים:', { fundKey, organization, hasProcessedData: !!processedData, rowsCount: processedData?.rows?.length })
    
    if (!processedData || !processedData.rows) {
      console.warn('⚠️ אין נתונים מעובדים עבור:', { fundKey, organization })
      continue
    }
    
    // מאתחל סיכום לפי קרן אם לא קיים
    if (!summary.byFund[fundKey]) {
      summary.byFund[fundKey] = {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supplierPayments: 0,
        supportsByCategory: {},
        totalAmount: 0
      }
    }
    
    // מאתחל סיכום לפי קרן וארגון אם לא קיים
    if (!summary.byFundAndOrganization[fundKey]) {
      summary.byFundAndOrganization[fundKey] = {}
    }
    if (!summary.byFundAndOrganization[fundKey][organization]) {
      summary.byFundAndOrganization[fundKey][organization] = {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supplierPayments: 0,
        supportsByCategory: {},
        totalAmount: 0
      }
    }
    
    // מאתחל סיכום לפי ארגון אם לא קיים
    if (!summary.byOrganization[organization]) {
      summary.byOrganization[organization] = {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supplierPayments: 0,
        supportsByCategory: {},
        totalAmount: 0
      }
    }
    
    const fundSummary = summary.byFund[fundKey]
    const fundOrgSummary = summary.byFundAndOrganization[fundKey][organization]
    const orgSummary = summary.byOrganization[organization]
    const totalSummary = summary.total
    
    for (const row of processedData.rows) {
      const signedMovementAmount = getRowGrossAmount(row)
      const amount = Math.abs(signedMovementAmount)
      const overheadAmount = getRowOverheadAmount(row)
      const type = row.type || ''
      
      // סיווג לפי סוג תנועה
      if (isDonation(type)) {
        fundSummary.donations += signedMovementAmount
        fundOrgSummary.donations += signedMovementAmount
        orgSummary.donations += signedMovementAmount
        totalSummary.donations += signedMovementAmount
        summary.byTransactionType.donations += signedMovementAmount
      } else if (isScholarship(type)) {
        fundSummary.scholarships += signedMovementAmount
        fundOrgSummary.scholarships += signedMovementAmount
        orgSummary.scholarships += signedMovementAmount
        totalSummary.scholarships += signedMovementAmount
        summary.byTransactionType.scholarships += signedMovementAmount
      } else if (isSupplierPayment(type)) {
        fundSummary.supplierPayments += signedMovementAmount
        fundOrgSummary.supplierPayments += signedMovementAmount
        orgSummary.supplierPayments += signedMovementAmount
        totalSummary.supplierPayments += signedMovementAmount
        summary.byTransactionType.supplierPayments += signedMovementAmount
      } else if (isSupport(type)) {
        fundSummary.supports += signedMovementAmount
        fundOrgSummary.supports += signedMovementAmount
        orgSummary.supports += signedMovementAmount
        totalSummary.supports += signedMovementAmount
        summary.byTransactionType.supports += signedMovementAmount
        
        // חיפוש קטגוריה ב-Google Sheets
        if (categoriesData && row.idNumber) {
          const matches = findAllMatchingCategories(
            categoriesData,
            row.idNumber,
            row.date,
            amount
          )
          
          if (matches.length > 1) {
            // קונפליקט - מספר קטגוריות תואמות
            summary.conflicts.push({
              idNumber: row.idNumber,
              date: row.date,
              amount,
              fund: fundKey,
              organization,
              matchingCategories: matches,
              row
            })
          } else if (matches.length === 1) {
            // קטגוריה יחידה
            const category = matches[0].category
            fundSummary.supportsByCategory[category] = (fundSummary.supportsByCategory[category] || 0) + signedMovementAmount
            fundOrgSummary.supportsByCategory[category] = (fundOrgSummary.supportsByCategory[category] || 0) + signedMovementAmount
            orgSummary.supportsByCategory[category] = (orgSummary.supportsByCategory[category] || 0) + signedMovementAmount
            totalSummary.supportsByCategory[category] = (totalSummary.supportsByCategory[category] || 0) + signedMovementAmount
            summary.byCategory[category] = (summary.byCategory[category] || 0) + signedMovementAmount
          }
        }
      }

      if (overheadAmount > 0) {
        fundSummary.overheads += overheadAmount
        fundOrgSummary.overheads += overheadAmount
        orgSummary.overheads += overheadAmount
        totalSummary.overheads += overheadAmount
        summary.byTransactionType.overheads += overheadAmount
      }
      
      fundSummary.totalAmount += signedMovementAmount
      fundOrgSummary.totalAmount += signedMovementAmount
      orgSummary.totalAmount += signedMovementAmount
      totalSummary.totalAmount += signedMovementAmount
    }
  }
  
  console.log('📊 סיכום סופי:', {
    byFund: Object.keys(summary.byFund).length,
    byOrganization: Object.keys(summary.byOrganization).length,
    byCategory: Object.keys(summary.byCategory).length,
    totalAmount: summary.total.totalAmount,
    conflicts: summary.conflicts.length
  })
  
  return summary
}

/**
 * מסכם נתונים לפי קרן בלבד (ללא ארגון)
 */
export const summarizeByFund = async (fund, startDate, endDate, googleSheetsId = null) => {
  const summary = await summarizeByFundAndOrganization(fund, startDate, endDate, googleSheetsId)
  return summary.total
}

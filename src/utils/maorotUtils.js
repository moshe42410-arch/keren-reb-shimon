import * as XLSX from 'xlsx'

export const normalizeString = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value
  const normalized = normalizeString(value).replace(/[₪,\s]/g, '')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const getMonthKey = (date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${month}/${year}`
}

export const parseMonthKeyToDate = (monthKey) => {
  if (!monthKey) return null
  const [month, year] = monthKey.split('/')
  if (!month || !year) return null
  const parsed = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export const excelSerialToDate = (value) => {
  if (typeof value !== 'number') return null
  const excelEpoch = new Date(Date.UTC(1899, 11, 30))
  const ms = value * 24 * 60 * 60 * 1000
  const date = new Date(excelEpoch.getTime() + ms)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export const formatDateDisplay = (value) => {
  if (!value) return ''
  let date = null
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'number') {
    date = excelSerialToDate(value)
  } else {
    const normalized = normalizeString(value)
    if (!normalized) return ''
    
    // בודק אם התאריך כבר בפורמט DD/MM/YYYY (פורמט ישראלי)
    // אם כן, מפרסר אותו ישירות כ-DD/MM/YYYY
    const parts = normalized.split(/[./-]/)
    if (parts.length === 3) {
      const [first, second, third] = parts
      const firstNum = parseInt(first, 10)
      const secondNum = parseInt(second, 10)
      const thirdNum = parseInt(third, 10)
      
      // אם החלק הראשון הוא בין 1-31 והחלק השני הוא בין 1-12, זה כנראה DD/MM/YYYY
      if (firstNum >= 1 && firstNum <= 31 && secondNum >= 1 && secondNum <= 12 && thirdNum >= 2000 && thirdNum <= 2100) {
        const candidate = new Date(thirdNum, secondNum - 1, firstNum)
        if (!Number.isNaN(candidate.getTime())) {
          date = candidate
        }
      } else {
        // נסה לפרסר כ-MM/DD/YYYY (פורמט אמריקאי) או YYYY-MM-DD
        const parsed = new Date(normalized)
        if (!Number.isNaN(parsed.getTime())) {
          date = parsed
        }
      }
    } else {
      // נסה לפרסר כ-MM/DD/YYYY (פורמט אמריקאי) או YYYY-MM-DD
      const parsed = new Date(normalized)
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed
      }
    }
  }

  if (!date || Number.isNaN(date.getTime())) return normalizeString(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).padStart(4, '0')
  return `${day}/${month}/${year}`
}

export const formatDateInput = (value) => {
  if (!value) return ''
  let date = null
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'number') {
    date = excelSerialToDate(value)
  } else {
    const normalized = normalizeString(value)
    if (!normalized) return ''
    const parsed = new Date(normalized)
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed
    } else {
      const parts = normalized.split(/[./-]/)
      if (parts.length === 3) {
        const [day, month, year] = parts
        const candidate = new Date(Number(year), Number(month) - 1, Number(day))
        if (!Number.isNaN(candidate.getTime())) {
          date = candidate
        }
      }
    }
  }
  if (!date || Number.isNaN(date.getTime())) return ''
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const readSpreadsheetFile = async (file) => {
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    // מוסיף אופציות נוספות לטיפול בקבצים עם בעיות XML
    const workbook = XLSX.read(data, { 
      type: 'array',
      cellStyles: false,
      cellNF: false,
      cellHTML: false,
      sheetStubs: false,
      bookVBA: false,
      bookSheets: false,
      bookProps: false,
      bookFiles: false,
      bookSST: false,
      password: '',
    })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error('לא נמצא גיליון בקובץ Excel')
    }
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: '',
      raw: false,
    })
    return {
      workbook,
      sheetName,
      rawData,
      headers: rawData[0] || [],
      rows: rawData.slice(1),
    }
  } catch (error) {
    console.error('שגיאה בקריאת קובץ Excel:', error)
    // אם יש בעיה עם XLSX, ננסה גישה אחרת
    if (error.message && error.message.includes('Unknown Namespace')) {
      throw new Error('הקובץ Excel מכיל פורמט לא נתמך. נא לנסות לשמור את הקובץ מחדש בפורמט .xlsx או .xls')
    }
    throw new Error(`לא ניתן לקרוא את הקובץ: ${error.message || 'שגיאה לא ידועה'}`)
  }
}

export const findColumnIndex = (headers, searchTerms, defaultIndex = null) => {
  if (!headers || headers.length === 0) return defaultIndex
  const index = headers.findIndex((header) => {
    if (!header) return false
    const headerStr = normalizeString(header).toLowerCase()
    return searchTerms.some((term) => headerStr.includes(term.toLowerCase()))
  })
  return index !== -1 ? index : defaultIndex
}

export const normalizeSupportType = (value) => {
  const raw = normalizeString(value).toLowerCase()
  if (!raw) return ''
  if (raw.includes('חד')) return 'חד-פעמית'
  if (raw.includes('לתקופה') || raw.includes('תקופה')) return 'קבועה לתקופה'
  if (raw.includes('קבוע')) return 'קבועה'
  return normalizeString(value)
}

export const normalizeStatus = (value) => {
  const raw = normalizeString(value).toLowerCase()
  if (!raw) return 'פעיל'
  if (raw.includes('הפסק')) return 'הפסקה'
  if (raw.includes('השה')) return 'השהיה'
  if (raw.includes('המשך') || raw.includes('פעיל')) return 'פעיל'
  return normalizeString(value)
}

export const RETURN_FILE_MAPPING = {
  idIndex: 0,
  generalSupplierIndex: 1,
  maorotSupplierIndex: 2,
  nameIndex: 3,
  dateIndex: 4,
  amountIndex: 5,
}

/**
 * מנרמל מספר זהות/מזהה - מסיר תווים לא-מספריים ואפסים מובילים
 * כך ש-000123456, 00123456, 123456 יהפכו כולם ל-123456
 * מטפל גם בפורמט מדעי (scientific notation) כמו "3.19E+08"
 */
export const normalizeIdentifier = (value) => {
  if (value === null || value === undefined) return ''

  // טיפול בסוג מספרי - המרה ישירה למחרוזת מלאה (ללא scientific notation)
  if (typeof value === 'number' && isFinite(value)) {
    const str = Math.round(Math.abs(value)).toString()
    const withoutLeadingZeros = str.replace(/^0+/, '')
    return withoutLeadingZeros || '0'
  }

  let str = String(value).trim()

  // טיפול במחרוזת בפורמט מדעי (למשל "3.19E+08", "3.18957875E8")
  if (/[eE][+-]?\d/.test(str)) {
    const num = Number(str)
    if (!isNaN(num) && isFinite(num) && Math.abs(num) < Number.MAX_SAFE_INTEGER) {
      str = Math.round(Math.abs(num)).toString()
    }
  }

  const cleaned = str.replace(/\D/g, '')
  // הסרת אפסים מובילים - אבל שומר על 0 אם המספר הוא רק 0
  if (!cleaned) return ''
  const withoutLeadingZeros = cleaned.replace(/^0+/, '')
  return withoutLeadingZeros || '0' // אם הכל היה אפסים, נחזיר '0'
}

export const buildReturnFileRows = (rawData, mapping = RETURN_FILE_MAPPING) => {
  if (!rawData || rawData.length === 0) return []
  const rows = rawData.slice(1).filter((row) => row && row.some((cell) => normalizeString(cell)))
  return rows.map((row) => ({
    idNumber: normalizeIdentifier(row[mapping.idIndex] || ''), // מנורמל - מסיר אפסים מובילים
    generalSupplierNumber: normalizeIdentifier(row[mapping.generalSupplierIndex] || ''), // מנורמל
    maorotSupplierNumber: normalizeIdentifier(row[mapping.maorotSupplierIndex] || ''), // מנורמל
    name: normalizeString(row[mapping.nameIndex] || ''),
    date: row[mapping.dateIndex] ?? '',
    amount: parseAmount(row[mapping.amountIndex]),
    rawRow: row,
  }))
}

/**
 * בונה שורות מקובץ חוזר בפורמט שנתי
 * פורמט: מספר ספק כולל, מספר ספק מאורות, ת.ז, שם, ולאחר מכן עמודות חודשיות (07, 08, 09 וכו')
 * כל עמודת חודש יוצרת שורה נפרדת
 */
/**
 * בונה שורות מקובץ חוזר בפורמט שנתי
 * פורמט: מספר ספק כולל, מספר ספק מאורות, ת.ז, שם, ולאחר מכן עמודות חודשיות (07, 08, 09 וכו')
 * כל עמודת חודש יוצרת שורה נפרדת
 */
export const buildReturnFileRowsYearly = (rawData, year = null) => {
  if (!rawData || rawData.length === 0) return []
  
  const headers = rawData[0] || []
  const rows = rawData.slice(1).filter((row) => row && row.some((cell) => normalizeString(cell)))
  
  // אם לא הועברה שנה, משתמשים בשנה הנוכחית
  const targetYear = year || new Date().getFullYear()
  
  // מציאת אינדקסים של עמודות הבסיס לפי סדר: מספר ספק כולל (0), מספר ספק מאורות (1), ת.ז (2), שם (3)
  // אבל מחפש לפי שם העמודה, לא לפי אינדקס
  const generalSupplierIndex = findColumnIndex(headers, ['מספר ספק כולל', 'מס\' ספק כולל', 'ספק כולל'], 0)
  const maorotSupplierIndex = findColumnIndex(headers, ['מספר ספק מאורות', 'מס\' ספק מאורות', 'ספק מאורות'], 1)
  const idIndex = findColumnIndex(headers, ['ת.ז', 'תז', 'מ.ז', 'מספר זהות'], 2)
  const nameIndex = findColumnIndex(headers, ['שם'], 3)
  
  // מציאת עמודות חודשיות (7, 8, 9, 10, 11, 12 או 07, 08, 09 וכו')
  // דילוג על 4 העמודות הראשונות (מספר ספק כולל, מספר ספק מאורות, ת.ז, שם)
  const monthColumns = []
  headers.forEach((header, index) => {
    // דילוג על עמודות הבסיס - בודק אם זה אחד מהאינדקסים של עמודות הבסיס
    if (index === generalSupplierIndex || index === maorotSupplierIndex || index === idIndex || index === nameIndex) {
      return
    }
    const headerStr = normalizeString(header)
    // בודק אם זה מספר חודש (1-12 או 01-12) - גם ספרה אחת וגם שתי ספרות
    const monthMatch = headerStr.match(/^(\d{1,2})$/)
    if (monthMatch) {
      const monthNum = parseInt(monthMatch[1], 10)
      if (monthNum >= 1 && monthNum <= 12) {
        monthColumns.push({ index, month: monthNum, header: headerStr })
      }
    }
  })
  
  const resultRows = []
  
  rows.forEach((row, rowIndex) => {
    const generalSupplierNumber = normalizeIdentifier(row[generalSupplierIndex] || '') // מנורמל - מסיר אפסים מובילים
    const maorotSupplierNumber = normalizeIdentifier(row[maorotSupplierIndex] || '') // מנורמל
    const idNumber = normalizeIdentifier(row[idIndex] || '') // מנורמל - מסיר אפסים מובילים
    const name = normalizeString(row[nameIndex] || '')
    
    // אם אין נתונים בסיסיים, דילוג
    if (!generalSupplierNumber && !maorotSupplierNumber && !idNumber) {
      return
    }
    
    // עבור כל עמודת חודש, יצירת שורה נפרדת - רק אם הסכום גדול מ-0
    monthColumns.forEach(({ index, month }) => {
      const amount = parseAmount(row[index])
      // לא יוצרים שורה אם הסכום הוא 0 או ריק
      if (amount <= 0) {
        return
      }
      
      // יצירת תאריך לחודש (יום 1 של החודש)
      // פורמט תאריך: DD/MM/YYYY - תמיד יום 1 של החודש הרלוונטי (פורמט ישראלי)
      const day = '01'
      const monthStr = String(month).padStart(2, '0')
      const yearStr = String(targetYear)
      const formattedDate = `${day}/${monthStr}/${yearStr}`
      
      resultRows.push({
        idNumber,
        generalSupplierNumber,
        maorotSupplierNumber,
        name,
        date: formattedDate, // תאריך בפורמט DD/MM/YYYY
        amount,
        rawRow: [...row], // שמירת השורה המקורית
        sourceRowIndex: rowIndex,
        month,
      })
    })
  })
  
  return resultRows
}

export const buildSupportIdentifiers = (support, headers = []) => {
  const identifiers = new Set()
  const idValue = normalizeIdentifier(support.idNumber)
  if (idValue) identifiers.add(idValue)

  if (headers.length > 0 && Array.isArray(support.rawRow)) {
    const generalIndex = findColumnIndex(headers, ['מס\' ספק כולל', 'ספק כולל'], 1)
    const maorotIndex = findColumnIndex(headers, ['מס\' ספק מאורות', 'ספק מאורות'], 2)
    const generalValue = normalizeIdentifier(support.rawRow[generalIndex])
    const maorotValue = normalizeIdentifier(support.rawRow[maorotIndex])
    if (generalValue) identifiers.add(generalValue)
    if (maorotValue) identifiers.add(maorotValue)
  }

  return identifiers
}

export const parseDirectoryRows = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return { entries: [], headers: [] }
  }

  const headers = rawData[0] || []
  const idIndex = findColumnIndex(headers, ['מ.ז', 'תעודת', 'זהות', 'id'], 0)
  const generalSupplierIndex = findColumnIndex(headers, ['מס\' ספק כולל', 'ספק כולל'], 1)
  const maorotSupplierIndex = findColumnIndex(headers, ['מס\' ספק מאורות', 'ספק מאורות', 'מאורות'], 2)
  const nameIndex = findColumnIndex(headers, ['שם', 'נתמך', 'מקבל'], 3)
  const bankIndex = findColumnIndex(headers, ['מס\' בנק', 'בנק'], 4)
  const branchIndex = findColumnIndex(headers, ['מס\' סניף', 'סניף'], 5)
  const accountIndex = findColumnIndex(headers, ['מס\' חשבון', 'חשבון'], 6)

  const entries = rawData
    .slice(1)
    .filter((row) => row && row.some((cell) => normalizeString(cell)))
    .map((row, rowIndex) => ({
      id: `${Date.now()}-${rowIndex}`,
      idNumber: normalizeIdentifier(row[idIndex]), // מנורמל - מסיר אפסים מובילים
      maorotSupplierNumber: normalizeIdentifier(row[maorotSupplierIndex]), // מנורמל
      generalSupplierNumber: normalizeIdentifier(row[generalSupplierIndex]), // מנורמל
      name: normalizeString(row[nameIndex]),
      bankNumber: normalizeString(row[bankIndex]),
      branchNumber: normalizeString(row[branchIndex]),
      accountNumber: normalizeString(row[accountIndex]),
      rawRow: row,
    }))

  return { entries, headers }
}

export const parseSupportRows = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return { entries: [], headers: [] }
  }

  const headers = rawData[0] || []
  const idIndex = findColumnIndex(headers, ['מ.ז', 'תעודת', 'זהות', 'id'], 0)
  const nameIndex = findColumnIndex(headers, ['שם', 'נתמך', 'מקבל'], 1)
  const amountIndex = findColumnIndex(headers, ['סכום', 'amount', 'סך'], 2)
  const supportTypeIndex = findColumnIndex(headers, ['סוג תמיכה', 'סוג', 'type', 'קבוע'], 7)
  const monthsIndex = findColumnIndex(headers, ['מספר חודשים', 'משך', 'חודשים'], 8)
  const endDateIndex = findColumnIndex(headers, ['מועד סיום', 'תאריך סיום', 'סיום'], 8)
  const statusIndex = findColumnIndex(headers, ['סטטוס', 'status', 'מצב', 'הפסק', 'השהיה'], 10)

  const entries = rawData
    .slice(1)
    .filter((row) => row && row.some((cell) => normalizeString(cell)))
    .map((row, rowIndex) => {
      const rawStatus = normalizeString(row[statusIndex])
      const rawSupportType = normalizeString(row[supportTypeIndex])
      const monthsValue = normalizeString(row[monthsIndex])
      const periodMonths = monthsValue ? Number(monthsValue) : null
      const normalizedStatus = normalizeStatus(rawStatus)
      if (!rawStatus && Number.isInteger(statusIndex)) {
        row[statusIndex] = normalizedStatus
      }
      return {
        id: `${Date.now()}-${rowIndex}`,
        idNumber: normalizeIdentifier(row[idIndex]), // מנורמל - מסיר אפסים מובילים
        name: normalizeString(row[nameIndex]),
        amount: normalizeString(row[amountIndex]),
        supportType: normalizeSupportType(rawSupportType) || 'קבועה',
        periodMonths: Number.isNaN(periodMonths) ? null : periodMonths,
        periodRemaining: Number.isNaN(periodMonths) ? null : periodMonths,
        endDate: normalizeString(row[endDateIndex]),
        status: normalizedStatus,
        exportedMonths: [],
        rawRow: row,
        rawData: headers.reduce((acc, header, colIndex) => {
          acc[normalizeString(header) || `עמודה ${colIndex + 1}`] = row[colIndex]
          return acc
        }, {}),
      }
    })

  return {
    entries,
    headers,
    columnMapping: {
      idIndex,
      nameIndex,
      amountIndex,
      supportTypeIndex,
      monthsIndex,
      endDateIndex,
      statusIndex,
    },
  }
}

export const buildSupportEntryFromRow = (headers, row, columnMapping = {}) => {
  const effectiveMapping = {
    idIndex: columnMapping.idIndex ?? findColumnIndex(headers, ['מ.ז', 'תעודת', 'זהות', 'id'], 0),
    nameIndex:
      columnMapping.nameIndex ?? findColumnIndex(headers, ['שם', 'נתמך', 'מקבל'], 1),
    amountIndex:
      columnMapping.amountIndex ?? findColumnIndex(headers, ['סכום', 'amount', 'סך'], 2),
    supportTypeIndex:
      columnMapping.supportTypeIndex ??
      findColumnIndex(headers, ['סוג תמיכה', 'סוג', 'type', 'קבוע'], 7),
    monthsIndex:
      columnMapping.monthsIndex ?? findColumnIndex(headers, ['מספר חודשים', 'משך', 'חודשים'], 8),
    endDateIndex:
      columnMapping.endDateIndex ??
      findColumnIndex(headers, ['מועד סיום', 'תאריך סיום', 'סיום'], 8),
    statusIndex:
      columnMapping.statusIndex ??
      findColumnIndex(headers, ['סטטוס', 'status', 'מצב', 'הפסק', 'השהיה'], 10),
  }

  const rawStatus = normalizeString(row[effectiveMapping.statusIndex])
  const rawSupportType = normalizeString(row[effectiveMapping.supportTypeIndex])
  const monthsValue = normalizeString(row[effectiveMapping.monthsIndex])
  const periodMonths = monthsValue ? Number(monthsValue) : null

  return {
    id: `${Date.now()}-${Math.random()}`,
    idNumber: normalizeString(row[effectiveMapping.idIndex]),
    name: normalizeString(row[effectiveMapping.nameIndex]),
    amount: normalizeString(row[effectiveMapping.amountIndex]),
    supportType: normalizeSupportType(rawSupportType) || 'קבועה',
    periodMonths: Number.isNaN(periodMonths) ? null : periodMonths,
    periodRemaining: Number.isNaN(periodMonths) ? null : periodMonths,
    endDate: normalizeString(row[effectiveMapping.endDateIndex]),
    status: normalizeStatus(rawStatus),
    exportedMonths: [],
    rawRow: row,
    rawData: headers.reduce((acc, header, colIndex) => {
      acc[normalizeString(header) || `עמודה ${colIndex + 1}`] = row[colIndex]
      return acc
    }, {}),
  }
}

export const buildTemplateRow = (headers, valuesMap) => {
  const ordered = {}
  headers.forEach((header) => {
    const key = normalizeString(header)
    ordered[key] = valuesMap[key] ?? ''
  })
  return ordered
}

export const mapValuesToTemplate = (headers, values) => {
  const normalizedHeaders = headers.map((header) => normalizeString(header))
  const headerLookup = normalizedHeaders.reduce((acc, header) => {
    acc[header.toLowerCase()] = header
    return acc
  }, {})

  const setByHeaderMatch = (terms, value) => {
    const matchKey = Object.keys(headerLookup).find((header) =>
      terms.some((term) => header.includes(term))
    )
    if (matchKey) {
      const header = headerLookup[matchKey]
      values[header] = value
    }
  }

  const valuesMap = {}
  normalizedHeaders.forEach((header) => {
    valuesMap[header] = ''
  })

  setByHeaderMatch(['מ.ז', 'ת.ז', 'זהות', 'id'], values.idNumber)
  setByHeaderMatch(['שם', 'נתמך', 'מקבל'], values.name)
  setByHeaderMatch(['סכום', 'amount', 'סך'], values.amount)
  setByHeaderMatch(['מס\' בנק', 'בנק'], values.bankNumber)
  setByHeaderMatch(['מס\' סניף', 'סניף'], values.branchNumber)
  setByHeaderMatch(['מס\' חשבון', 'חשבון'], values.accountNumber)
  setByHeaderMatch(['ספק מאורות', 'מאורות'], values.maorotSupplierNumber)
  setByHeaderMatch(['ספק כולל', 'כולל'], values.generalSupplierNumber)
  setByHeaderMatch(['סוג תמיכה', 'סוג'], values.supportType)

  return buildTemplateRow(headers, { ...valuesMap, ...values })
}


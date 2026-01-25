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
  const data = new Uint8Array(await file.arrayBuffer())
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  return {
    workbook,
    sheetName,
    rawData,
    headers: rawData[0] || [],
    rows: rawData.slice(1),
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

export const normalizeIdentifier = (value) => normalizeString(value).replace(/\D/g, '')

export const buildReturnFileRows = (rawData, mapping = RETURN_FILE_MAPPING) => {
  if (!rawData || rawData.length === 0) return []
  const rows = rawData.slice(1).filter((row) => row && row.some((cell) => normalizeString(cell)))
  return rows.map((row) => ({
    idNumber: normalizeString(row[mapping.idIndex] || ''),
    generalSupplierNumber: normalizeString(row[mapping.generalSupplierIndex] || ''),
    maorotSupplierNumber: normalizeString(row[mapping.maorotSupplierIndex] || ''),
    name: normalizeString(row[mapping.nameIndex] || ''),
    date: row[mapping.dateIndex] ?? '',
    amount: parseAmount(row[mapping.amountIndex]),
    rawRow: row,
  }))
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
      idNumber: normalizeString(row[idIndex]),
      maorotSupplierNumber: normalizeString(row[maorotSupplierIndex]),
      generalSupplierNumber: normalizeString(row[generalSupplierIndex]),
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
        idNumber: normalizeString(row[idIndex]),
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

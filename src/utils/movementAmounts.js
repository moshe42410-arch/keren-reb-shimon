const normalizeHeader = (header) => String(header || '').trim().toLowerCase()

export const parseFinancialNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (value === null || value === undefined || value === '') {
    return 0
  }

  let str = String(value).trim()
  str = str.replace(/[₪$€£¥,\s\u00A0]/g, '')

  if (str.startsWith('(') && str.endsWith(')')) {
    str = `-${str.slice(1, -1)}`
  }

  if (str.endsWith('-') && !str.startsWith('-')) {
    str = `-${str.slice(0, -1)}`
  }

  const parsed = parseFloat(str)
  return Number.isFinite(parsed) ? parsed : 0
}

export const getMovementColumnIndexes = (headers = []) => {
  const normalizedHeaders = headers.map(normalizeHeader)

  const convertedAmountIndex = normalizedHeaders.findIndex(
    (header) =>
      header.includes('סכום לאחר המרה') ||
      header.includes('amount after conversion') ||
      header.includes('converted amount')
  )

  const amountIndex = normalizedHeaders.findIndex(
    (header) =>
      (header === 'סכום' ||
        header.includes('סכום התנועה') ||
        header.includes('transaction amount') ||
        header.includes('amount')) &&
      !header.includes('לאחר המרה') &&
      !header.includes('מצטבר') &&
      !header.includes('תקורות')
  )

  const feeOIndex = normalizedHeaders.findIndex(
    (header) => header.includes('סכום תקורות') && !header.includes('חריג')
  )

  const feeQIndex = normalizedHeaders.findIndex(
    (header) => header.includes('סכום תקורות חריג') || header.includes('תקורה חריגה')
  )

  return {
    convertedAmountIndex,
    amountIndex,
    feeOIndex,
    feeQIndex,
  }
}

const getRawCellValue = (row, index) => {
  if (!Array.isArray(row?.rawRow) || !Number.isInteger(index) || index < 0) {
    return undefined
  }
  return row.rawRow[index]
}

export const getRowGrossAmount = (row) => {
  if (typeof row?.grossAmount === 'number' && Number.isFinite(row.grossAmount)) {
    return row.grossAmount
  }

  const mapping = getMovementColumnIndexes(row?.headers || [])
  const convertedValue = parseFinancialNumber(getRawCellValue(row, mapping.convertedAmountIndex))
  if (convertedValue !== 0) {
    return convertedValue
  }

  const directAmount = parseFinancialNumber(row?.amount)
  if (directAmount !== 0) {
    return directAmount
  }

  return parseFinancialNumber(getRawCellValue(row, mapping.amountIndex))
}

export const getRowOverheadAmount = (row) => {
  if (typeof row?.overheadAmount === 'number' && Number.isFinite(row.overheadAmount)) {
    return Math.abs(row.overheadAmount)
  }

  const mapping = getMovementColumnIndexes(row?.headers || [])
  const feeO = Math.abs(parseFinancialNumber(getRawCellValue(row, mapping.feeOIndex) ?? row?.feeO))
  const feeQ = Math.abs(parseFinancialNumber(getRawCellValue(row, mapping.feeQIndex) ?? row?.feeQ))
  return feeO + feeQ
}

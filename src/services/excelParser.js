import * as XLSX from 'xlsx'
import { debugExcelStructure } from '../utils/debugExcel'

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // קורא את הגיליון הראשון
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // ממיר ל-JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null 
        })
        
        // דיבאג - מראה את המבנה בקונסול (רק בפיתוח)
        if (import.meta.env.DEV) {
          console.log('=== מבנה קובץ Excel ===')
          debugExcelStructure(workbook)
        }
        
        resolve({
          rawData: jsonData,
          sheetName: firstSheetName,
          workbook
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'))
    reader.readAsArrayBuffer(file)
  })
}

export const processExcelData = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return null
  }

  // מניחים שהשורה הראשונה היא כותרות
  const headers = rawData[0]
  
  // פונקציה עזר למציאת עמודה לפי שם
  const findColumnIndex = (searchTerms, defaultIndex = null) => {
    const index = headers.findIndex((header, idx) => {
      if (!header) return false
      const headerStr = String(header).toLowerCase()
      return searchTerms.some(term => headerStr.includes(term.toLowerCase()))
    })
    return index !== -1 ? index : defaultIndex
  }
  
  // זיהוי עמודות דינמי
  // עמודה G - סוג התנועה
  let colGIndex = 6 // ברירת מחדל G (index 6)
  const typeSearchTerms = ['סוג', 'type', 'סוג תנועה', 'סוג פעולה']
  const foundTypeIndex = findColumnIndex(typeSearchTerms)
  if (foundTypeIndex !== null) {
    colGIndex = foundTypeIndex
    console.log(`נמצאה עמודת סוג תנועה: ${String.fromCharCode(65 + colGIndex)} (index ${colGIndex})`)
  }
  
  // עמודות O, P, Q - עמלות
  let colOIndex = 14 // ברירת מחדל O (index 14)
  let colPIndex = 15 // ברירת מחדל P (index 15)
  let colQIndex = 16 // ברירת מחדל Q (index 16)
  
  // מחפש עמודות עמלה
  const feeSearchTerms = ['עמלה', 'fee', 'commission', 'תשלום', 'עמלות']
  const feeColumns = []
  headers.forEach((header, index) => {
    if (header && feeSearchTerms.some(term => String(header).toLowerCase().includes(term.toLowerCase()))) {
      feeColumns.push(index)
    }
  })
  
  if (feeColumns.length >= 3) {
    colOIndex = feeColumns[0]
    colPIndex = feeColumns[1]
    colQIndex = feeColumns[2]
    console.log(`נמצאו עמודות עמלה: ${String.fromCharCode(65 + colOIndex)}, ${String.fromCharCode(65 + colPIndex)}, ${String.fromCharCode(65 + colQIndex)}`)
  }
  
  // מחפש עמודה של סכום
  let amountColIndex = 3 // ברירת מחדל D (index 3)
  const amountSearchTerms = ['סכום', 'amount', 'sum', 'סכום התנועה', 'סכום כולל']
  const foundAmountIndex = findColumnIndex(amountSearchTerms, 3)
  if (foundAmountIndex !== null) {
    amountColIndex = foundAmountIndex
    console.log(`נמצאה עמודת סכום: ${String.fromCharCode(65 + amountColIndex)} (index ${amountColIndex})`)
  }
  
  // מחפש עמודה של מספר זהות
  // באקסל: מ.ז נמצא בעמודה I (index 8)
  let idColIndex = 8 // ברירת מחדל I (index 8)
  const idSearchTerms = ['תעודת', 'זהות', 'id', 'מספר', 'מספר זהות', 'ת.ז']
  const foundIdIndex = findColumnIndex(idSearchTerms, 8)
  if (foundIdIndex !== null && foundIdIndex !== 8) {
    // אם מצאנו עמודה אחרת, נשתמש בה
    idColIndex = foundIdIndex
    console.log(`נמצאה עמודת מספר זהות: ${String.fromCharCode(65 + idColIndex)} (index ${idColIndex})`)
  } else {
    // אם לא מצאנו, נשתמש ב-I (index 8) כברירת מחדל
    idColIndex = 8
    console.log(`משתמש בעמודת מספר זהות ברירת מחדל: I (index 8)`)
  }
  
  // מחפש עמודה של תאריך
  // באקסל: תאריך נמצא בעמודה A (index 0)
  let dateColIndex = 0 // ברירת מחדל A (index 0)
  const dateSearchTerms = ['תאריך', 'date', 'יום', 'תאריך התנועה', 'חודש']
  const foundDateIndex = findColumnIndex(dateSearchTerms, 0)
  if (foundDateIndex !== null && foundDateIndex !== 0) {
    // אם מצאנו עמודה אחרת, נשתמש בה
    dateColIndex = foundDateIndex
    console.log(`נמצאה עמודת תאריך: ${String.fromCharCode(65 + dateColIndex)} (index ${dateColIndex})`)
  } else {
    // אם לא מצאנו, נשתמש ב-A (index 0) כברירת מחדל
    dateColIndex = 0
    console.log(`משתמש בעמודת תאריך ברירת מחדל: A (index 0)`)
  }
  
  // מחפש עמודה של שם
  // באקסל: שם נמצא בעמודה H (index 7)
  let nameColIndex = 7 // ברירת מחדל H (index 7)
  console.log(`משתמש בעמודת שם: H (index 7)`)
  
  // אוסף את כל הנתונים מהשורות (מהשורה השנייה ואילך)
  const rows = rawData.slice(1).filter(row => row && row.length > 0)
  
  const processedRows = rows.map((row, index) => ({
    rowIndex: index + 2, // +2 כי השורה הראשונה היא כותרת ואנחנו מתחילים מ-0
    type: String(row[colGIndex] || '').trim(), // סוג התנועה - עמודה G
    amount: parseFloat(row[amountColIndex]) || 0, // סכום התנועה
    feeO: parseFloat(row[colOIndex]) || 0, // עמלה O
    feeP: parseFloat(row[colPIndex]) || 0, // עמלה P
    feeQ: parseFloat(row[colQIndex]) || 0, // עמלה Q
    totalFee: (parseFloat(row[colOIndex]) || 0) + 
              (parseFloat(row[colPIndex]) || 0) + 
              (parseFloat(row[colQIndex]) || 0),
    // שמירת נתונים נוספים לשימוש בקטגוריות
    idNumber: String(row[idColIndex] || '').trim(), // מספר זהות
    name: String(row[nameColIndex] || '').trim(), // שם
    date: row[dateColIndex] || '', // תאריך
    rawRow: row,
    headers: headers
  })).filter(row => row.rawRow && row.rawRow.length > 0) // מסנן שורות ריקות
  
  console.log(`עובד ${processedRows.length} שורות`)
  
  return {
    headers,
    rows: processedRows,
    rawData,
    columnMapping: {
      type: colGIndex,
      amount: amountColIndex,
      feeO: colOIndex,
      feeP: colPIndex,
      feeQ: colQIndex,
      idNumber: idColIndex,
      name: nameColIndex,
      date: dateColIndex
    }
  }
}

// סיכום לפי סוג תנועה (עמודה G)
export const summarizeByTransactionType = (processedData) => {
  if (!processedData || !processedData.rows) {
    return {}
  }
  
  const summary = {}
  
  processedData.rows.forEach(row => {
    const type = row.type || 'ללא סוג'
    if (!summary[type]) {
      summary[type] = {
        type,
        count: 0,
        totalAmount: 0
      }
    }
    
    // משתמש בסכום שכבר חושב ב-processExcelData
    const amount = row.amount || 0
    summary[type].count += 1
    summary[type].totalAmount += amount
  })
  
  return summary
}

// סיכום עמלות (עמודות O+P+Q)
export const summarizeFees = (processedData) => {
  if (!processedData || !processedData.rows) {
    return {
      totalFees: 0,
      byRow: []
    }
  }
  
  let totalFees = 0
  const byRow = []
  
  processedData.rows.forEach(row => {
    totalFees += row.totalFee
    if (row.totalFee > 0) {
      byRow.push({
        rowIndex: row.rowIndex,
        feeO: row.feeO,
        feeP: row.feeP,
        feeQ: row.feeQ,
        totalFee: row.totalFee
      })
    }
  })
  
  return {
    totalFees,
    byRow,
    averageFee: totalFees / processedData.rows.length || 0
  }
}

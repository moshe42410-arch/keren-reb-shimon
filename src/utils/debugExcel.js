// כלי לבדיקת מבנה קובץ Excel
// להשתמש בפונקציה זו בדיבאג כדי לראות את המבנה המדויק של הקובץ

import * as XLSX from 'xlsx'

export const debugExcelStructure = (workbook) => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  
  console.log('=== מבנה קובץ Excel ===')
  console.log('מספר שורות:', jsonData.length)
  console.log('שורת כותרות:', jsonData[0])
  console.log('שורות ראשונות:')
  jsonData.slice(0, 5).forEach((row, index) => {
    console.log(`שורה ${index + 1}:`, row)
  })
  
  // מנסה לזהות עמודות
  const headers = jsonData[0] || []
  console.log('\n=== זיהוי עמודות ===')
  headers.forEach((header, index) => {
    let column = ''
    if (index < 26) {
      column = String.fromCharCode(65 + index) // A-Z
    } else {
      // תמיכה בעמודות מעבר ל-Z (AA, AB, וכו')
      const firstChar = String.fromCharCode(64 + Math.floor(index / 26))
      const secondChar = String.fromCharCode(65 + (index % 26))
      column = firstChar + secondChar
    }
    console.log(`עמודה ${column} (index ${index}):`, header)
  })
  
  // מציג דוגמאות של שורות עם נתונים
  console.log('\n=== דוגמאות שורות עם נתונים ===')
  jsonData.slice(1, 4).forEach((row, index) => {
    console.log(`שורה ${index + 2}:`, {
      'מספר זהות (A)': row[0],
      'תאריך (B)': row[1],
      'סכום (D)': row[3],
      'סוג תנועה (G)': row[6],
      'עמלה O': row[14],
      'עמלה P': row[15],
      'עמלה Q': row[16]
    })
  })
  
  return jsonData
}

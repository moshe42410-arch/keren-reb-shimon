import * as XLSX from 'xlsx'

/**
 * יוצר קובץ Excel עם נתונים ומתחיל הורדה
 * @param {Array} data - נתונים לייצוא
 * @param {string} sheetName - שם הגיליון
 * @param {string} fileName - שם הקובץ
 */
export const exportToExcel = (data, sheetName = 'Sheet1', fileName = 'export.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('אין נתונים לייצוא')
    return
  }
  
  const ws = XLSX.utils.json_to_sheet(data)
  
  // הגדרת כיוון RTL (מימין לשמאל) לגיליון
  ws['!sheetViews'] = [{
    rightToLeft: true // כיוון מימין לשמאל
  }]
  
  // הגדרת רוחב עמודות אוטומטי
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  ws['!cols'] = []
  for (let C = range.s.c; C <= range.e.c; ++C) {
    ws['!cols'][C] = { wch: 20 } // רוחב עמודה בסיסי
  }
  
  // הגדרת יישור מימין לשמאל לכל התאים
  if (range && ws['!ref']) {
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[cellAddress]) continue
        
        // יצירת אובייקט style אם לא קיים
        if (!ws[cellAddress].s) {
          ws[cellAddress].s = {}
        }
        if (!ws[cellAddress].s.alignment) {
          ws[cellAddress].s.alignment = {}
        }
        // יישור מימין לשמאל
        ws[cellAddress].s.alignment.horizontal = 'right'
        ws[cellAddress].s.alignment.vertical = 'center'
        ws[cellAddress].s.alignment.readingOrder = 2 // RTL reading order
      }
    }
  }
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName)
}

/**
 * יוצר קובץ Excel מפולח לפי קטגוריה
 * @param {Array} rows - שורות הנתונים
 * @param {string} categoryField - שם השדה של הקטגוריה
 * @param {string} baseFileName - שם בסיס לקובץ
 */
export const exportByCategory = (rows, categoryField = 'category', baseFileName = 'export') => {
  const categories = {}
  
  rows.forEach(row => {
    const category = row[categoryField] || 'ללא קטגוריה'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(row)
  })
  
  Object.keys(categories).forEach(category => {
    const safeCategoryName = category.replace(/[^\w\s-]/g, '_')
    exportToExcel(
      categories[category],
      category,
      `${baseFileName}_${safeCategoryName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  })
}

/**
 * יוצר קובץ Excel מפולח לפי סוג פעולה
 * @param {Array} rows - שורות הנתונים
 * @param {string} typeField - שם השדה של סוג הפעולה
 * @param {string} baseFileName - שם בסיס לקובץ
 */
export const exportByType = (rows, typeField = 'type', baseFileName = 'export') => {
  const types = {}
  
  rows.forEach(row => {
    const type = row[typeField] || 'ללא סוג'
    if (!types[type]) {
      types[type] = []
    }
    types[type].push(row)
  })
  
  Object.keys(types).forEach(type => {
    const safeTypeName = type.replace(/[^\w\s-]/g, '_')
    exportToExcel(
      types[type],
      type,
      `${baseFileName}_${safeTypeName}_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  })
}

/**
 * יוצר קובץ Excel מפולח לפי חודש ושנה
 * @param {Array} rows - שורות הנתונים
 * @param {string} dateField - שם השדה של התאריך
 * @param {string} baseFileName - שם בסיס לקובץ
 */
export const exportByMonthYear = (rows, dateField = 'date', baseFileName = 'export') => {
  const byMonthYear = {}
  
  rows.forEach(row => {
    const dateStr = row[dateField] || ''
    if (!dateStr) return
    
    try {
      const date = new Date(dateStr)
      const monthYear = `${date.getMonth() + 1}_${date.getFullYear()}`
      
      if (!byMonthYear[monthYear]) {
        byMonthYear[monthYear] = []
      }
      byMonthYear[monthYear].push(row)
    } catch (err) {
      console.error('Error parsing date:', err)
    }
  })
  
  Object.keys(byMonthYear).forEach(monthYear => {
    exportToExcel(
      byMonthYear[monthYear],
      monthYear,
      `${baseFileName}_${monthYear}_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  })
}

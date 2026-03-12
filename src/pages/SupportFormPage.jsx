import React, { useState, useEffect, useMemo } from 'react'
import { loadMaorotData, saveMaorotData } from '../services/maorotStorage'
import {
  normalizeString,
  findColumnIndex,
  buildSupportEntryFromRow,
  normalizeStatus,
  normalizeIdentifier,
  parseAmount,
} from '../utils/maorotUtils'

const SupportFormPage = () => {
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formHeaders, setFormHeaders] = useState([])
  const [directoryEntries, setDirectoryEntries] = useState([])

  // טוען את האלפון והכותרות
  useEffect(() => {
    const maorotData = loadMaorotData()
    setDirectoryEntries(maorotData.directoryEntries || [])
    
    if (maorotData.supportsHeaders && maorotData.supportsHeaders.length > 0) {
      setFormHeaders(maorotData.supportsHeaders)
      // מאתחל את הטופס עם שדות ריקים
      const initialData = {}
      maorotData.supportsHeaders.forEach((header) => {
        const key = normalizeString(header) || `עמודה ${maorotData.supportsHeaders.indexOf(header) + 1}`
        initialData[key] = ''
      })
      setFormData(initialData)
    } else {
      // אם אין כותרות, ניצור טופס בסיסי
      const defaultHeaders = [
        'מ.ז',
        "מס' ספק כולל",
        "מס' ספק מאורות",
        'שם',
        'סכום',
        "מס' בנק",
        "מס' סניף",
        "מס' חשבון",
        'סוג תמיכה',
        'חודשים',
        'סטטוס',
        'קטגוריה',
        'מסגרת',
      ]
      setFormHeaders(defaultHeaders)
      const initialData = {}
      defaultHeaders.forEach((header) => {
        const key = normalizeString(header)
        initialData[key] = ''
      })
      setFormData(initialData)
    }
  }, [])

  // יוצר lookup של האלפון לפי מספר זהות ומספרי ספק (גם מנורמל וגם מקורי)
  const directoryLookup = useMemo(() => {
    const lookup = {}
    directoryEntries.forEach((entry) => {
      // מספר זהות - גם מנורמל וגם מקורי
      const idNormalized = normalizeIdentifier(entry.idNumber)
      const idRaw = normalizeString(entry.idNumber)
      if (idNormalized) lookup[idNormalized] = entry
      if (idRaw && idRaw !== idNormalized) lookup[idRaw] = entry
      
      // מספר ספק כולל - גם מנורמל וגם מקורי
      const generalSupplierNormalized = normalizeIdentifier(entry.generalSupplierNumber)
      const generalSupplierRaw = normalizeString(entry.generalSupplierNumber)
      if (generalSupplierNormalized) lookup[generalSupplierNormalized] = entry
      if (generalSupplierRaw && generalSupplierRaw !== generalSupplierNormalized) lookup[generalSupplierRaw] = entry
      
      // מספר ספק מאורות - גם מנורמל וגם מקורי
      const maorotSupplierNormalized = normalizeIdentifier(entry.maorotSupplierNumber)
      const maorotSupplierRaw = normalizeString(entry.maorotSupplierNumber)
      if (maorotSupplierNormalized) lookup[maorotSupplierNormalized] = entry
      if (maorotSupplierRaw && maorotSupplierRaw !== maorotSupplierNormalized) lookup[maorotSupplierRaw] = entry
    })
    return lookup
  }, [directoryEntries])

  // פונקציה למציאת ערך באלפון - מחפש התאמה מלאה בלבד
  // דורש אורך מינימלי כדי למנוע התאמות מוקדמות מדי
  const getDirectoryEntry = (value, fieldType = 'id') => {
    if (!value) return null
    const normalized = normalizeIdentifier(value)
    const raw = normalizeString(value)
    
    // דורש אורך מינימלי לפי סוג השדה
    // מ.ז - לפחות 9 ספרות
    // מספר ספק - לפחות 5 ספרות (בד"כ 6 ספרות)
    const minLength = fieldType === 'id' ? 9 : 5
    
    if (normalized.length < minLength) return null
    
    // מחפש התאמה מדויקת באלפון
    return directoryLookup[normalized] || directoryLookup[raw] || null
  }

  const handleChange = (key, value) => {
    setFormData((prev) => {
      const formHeaderKeys = formHeaders.map((header) => normalizeString(header))
      
      // אם משנים מספר זהות - מאפס את כל השדות האחרים ואז מחפש באלפון
      const isIdField = key.includes('מ.ז') || key.includes('ת.ז') || key.includes('זהות')
      const isSupplierField = key.includes('ספק כולל') || key.includes('ספק מאורות')
      
      if (isIdField) {
        // מאפס את כל השדות חוץ מהמזהה
        const resetData = {}
        formHeaderKeys.forEach((k) => {
          resetData[k] = k === key ? value : ''
        })
        
        // מחפש באלפון - דורש מ.ז מלא (לפחות 9 ספרות)
        const directoryEntry = getDirectoryEntry(value, 'id')
        if (directoryEntry) {
          // ממלא את השדות מהאלפון
          const nameKey = formHeaderKeys.find((k) => k.includes('שם') && !k.includes('ספק'))
          if (nameKey) resetData[nameKey] = directoryEntry.name || ''
          
          const generalSupplierKey = formHeaderKeys.find((k) => 
            k.includes('ספק כולל') || k.includes('כולל מאורות')
          )
          if (generalSupplierKey) resetData[generalSupplierKey] = directoryEntry.generalSupplierNumber || ''
          
          const maorotSupplierKey = formHeaderKeys.find((k) => 
            k.includes('ספק מאורות') || k.includes('מאורות')
          )
          if (maorotSupplierKey) resetData[maorotSupplierKey] = directoryEntry.maorotSupplierNumber || ''
          
          const bankKey = formHeaderKeys.find((k) => k.includes('בנק'))
          if (bankKey) resetData[bankKey] = directoryEntry.bankNumber || ''
          
          const branchKey = formHeaderKeys.find((k) => k.includes('סניף'))
          if (branchKey) resetData[branchKey] = directoryEntry.branchNumber || ''
          
          const accountKey = formHeaderKeys.find((k) => k.includes('חשבון'))
          if (accountKey) resetData[accountKey] = directoryEntry.accountNumber || ''
        }
        
        return resetData
      }
      
      // אם משנים מספר ספק - מחפש באלפון (דורש לפחות 5 ספרות)
      if (isSupplierField) {
        const next = { ...prev, [key]: value }
        const directoryEntry = getDirectoryEntry(value, 'supplier')
        if (directoryEntry) {
          const nameKey = formHeaderKeys.find((k) => k.includes('שם') && !k.includes('ספק'))
          if (nameKey) next[nameKey] = directoryEntry.name || ''
          
          const idKey = formHeaderKeys.find((k) => 
            k.includes('מ.ז') || k.includes('ת.ז') || k.includes('זהות')
          )
          if (idKey) next[idKey] = directoryEntry.idNumber || ''
          
          if (!key.includes('ספק כולל')) {
            const generalSupplierKey = formHeaderKeys.find((k) => 
              k.includes('ספק כולל') || k.includes('כולל מאורות')
            )
            if (generalSupplierKey) next[generalSupplierKey] = directoryEntry.generalSupplierNumber || ''
          }
          
          if (!key.includes('ספק מאורות')) {
            const maorotSupplierKey = formHeaderKeys.find((k) => 
              k.includes('ספק מאורות') || k.includes('מאורות')
            )
            if (maorotSupplierKey) next[maorotSupplierKey] = directoryEntry.maorotSupplierNumber || ''
          }
          
          const bankKey = formHeaderKeys.find((k) => k.includes('בנק'))
          if (bankKey) next[bankKey] = directoryEntry.bankNumber || ''
          
          const branchKey = formHeaderKeys.find((k) => k.includes('סניף'))
          if (branchKey) next[branchKey] = directoryEntry.branchNumber || ''
          
          const accountKey = formHeaderKeys.find((k) => k.includes('חשבון'))
          if (accountKey) next[accountKey] = directoryEntry.accountNumber || ''
        }
        return next
      }
      
      // שדה רגיל - רק מעדכן אותו
      return { ...prev, [key]: value }
    })
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // בדיקת שדות חובה
    const idKey = Object.keys(formData).find((key) =>
      key.includes('מ.ז') || key.includes('ת.ז') || key.includes('זהות')
    )
    if (!idKey || !formData[idKey]?.trim()) {
      setError('יש למלא מספר זהות')
      return
    }

    try {
      const maorotData = loadMaorotData()
      const columnMapping = maorotData.supportsColumnMapping || {}

      // בונה שורה מהטופס
      const row = formHeaders.map((header) => {
        const key = normalizeString(header)
        return formData[key] || ''
      })

      // בונה תמיכה מהשורה
      const entry = buildSupportEntryFromRow(formHeaders, row, columnMapping)

      // קטגוריה ריקה - לא מציגים "ממתין לאישור" בקטגוריה
      const categoryIndex = findColumnIndex(formHeaders, ['קטגוריה', 'category'], null)
      const updatedRow = [...row]
      const updatedHeaders = [...formHeaders]
      
      if (categoryIndex !== null) {
        updatedRow[categoryIndex] = '' // קטגוריה ריקה עד שמנהל יגדיר
      }

      // בונה תמיכה מחדש
      const entryWithCategory = buildSupportEntryFromRow(
        updatedHeaders,
        updatedRow,
        columnMapping
      )

      // תמיכה ממתינה לאישור - בלי קטגוריה
      const entryWithPending = {
        ...entryWithCategory,
        status: normalizeStatus(entryWithCategory.status) || 'פעיל',
        pendingApproval: true,
        rawRow: updatedRow,
        rawData: {
          ...entryWithCategory.rawData,
          קטגוריה: '', // קטגוריה ריקה
        },
      }

      // מוסיף את התמיכה לרשימה
      const updatedSupports = [...(maorotData.supports || []), entryWithPending]
      
      // יוצר שורה ב-returnFileRows (לוח תנועות) עם קטגוריה "ממתין לאישור"
      const formHeaderKeys = formHeaders.map((header) => normalizeString(header))
      
      // מציאת הנתונים מהטופס
      const idKey = formHeaderKeys.find((k) => k.includes('מ.ז') || k.includes('ת.ז') || k.includes('זהות'))
      const generalSupplierKey = formHeaderKeys.find((k) => 
        k.includes('ספק כולל') || k.includes('כולל מאורות')
      )
      const maorotSupplierKey = formHeaderKeys.find((k) => 
        k.includes('ספק מאורות') || k.includes('מאורות')
      )
      const nameKey = formHeaderKeys.find((k) => k.includes('שם') && !k.includes('ספק'))
      const amountKey = formHeaderKeys.find((k) => k.includes('סכום') || k.includes('amount'))
      const dateKey = formHeaderKeys.find((k) => k.includes('תאריך') || k.includes('date'))
      
      const idNumber = normalizeIdentifier(formData[idKey] || '')
      const generalSupplierNumber = normalizeIdentifier(formData[generalSupplierKey] || '')
      const maorotSupplierNumber = normalizeIdentifier(formData[maorotSupplierKey] || '')
      const name = normalizeString(formData[nameKey] || '')
      const amount = parseAmount(formData[amountKey] || 0)
      
      // אם יש תאריך, משתמש בו, אחרת משתמש בתאריך נוכחי
      let date = formData[dateKey] || ''
      if (!date) {
        const today = new Date()
        const day = String(today.getDate()).padStart(2, '0')
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const year = today.getFullYear()
        date = `${day}/${month}/${year}`
      }
      
      // יוצר שורה חדשה ב-returnFileRows רק אם יש נתונים בסיסיים
      if (idNumber || generalSupplierNumber || maorotSupplierNumber) {
        const newReturnFileRow = {
          idNumber,
          generalSupplierNumber,
          maorotSupplierNumber,
          name,
          date,
          amount,
          pendingApproval: true, // סימון שהשורה ממתינה לאישור
          category: '', // קטגוריה ריקה עד שמנהל יגדיר
        }
        
        const updatedReturnFileRows = [...(maorotData.returnFileRows || []), newReturnFileRow]
        
        const updatedData = {
          ...maorotData,
          supports: updatedSupports,
          returnFileRows: updatedReturnFileRows,
        }
        
        saveMaorotData(updatedData)
      } else {
        // אם אין נתונים בסיסיים, רק שומר את התמיכות
        const updatedData = {
          ...maorotData,
          supports: updatedSupports,
        }
        saveMaorotData(updatedData)
      }
      setSubmitted(true)

      // מאפס את הטופס
      const resetData = {}
      formHeaders.forEach((header) => {
        const key = normalizeString(header)
        resetData[key] = ''
      })
      setFormData(resetData)

      // מאפס את ההודעה אחרי 3 שניות
      setTimeout(() => {
        setSubmitted(false)
      }, 3000)
    } catch (err) {
      console.error('שגיאה בשליחת הטופס:', err)
      setError('אירעה שגיאה בשליחת הטופס. נא לנסות שוב.')
    }
  }

  const formHeaderKeys = formHeaders.map((header) => normalizeString(header) || `עמודה ${formHeaders.indexOf(header) + 1}`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Header עם לוגו */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* לוגו FINANCE בצד שמאל */}
          <div className="flex flex-col items-start">
            <span 
              className="text-3xl font-extrabold"
              style={{
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: '1.2'
              }}
            >
              FINANCE
            </span>
            <span className="text-xs text-gray-600 mt-0.5 font-medium">
              תוכנה לניהול כספים
            </span>
          </div>
          
          {/* לוגו מרכז הצדקה בצד ימין */}
          <img 
            src="/לוגו.png" 
            alt="לוגו" 
            className="h-14 object-contain"
          />
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">טופס הוספת תמיכה</h1>
          <p className="text-sm text-gray-500 mb-6">
            מלא את הפרטים הבאים כדי להוסיף תמיכה חדשה. התמיכה תישלח לאישור מנהל המערכת.
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {submitted && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              הטופס נשלח בהצלחה! התמיכה נשלחה לאישור מנהל המערכת.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {formHeaders.map((header, index) => {
                const key = formHeaderKeys[index]
                const isRequired = key.includes('מ.ז') || key.includes('ת.ז') || key.includes('זהות')
                return (
                  <div key={`${key}-${index}`} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      {header}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {key.includes('סטטוס') || key.includes('status') ? (
                      <select
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="">בחר סטטוס</option>
                        <option value="פעיל">פעיל</option>
                        <option value="הפסקה">הפסקה</option>
                        <option value="השהיה">השהיה</option>
                      </select>
                    ) : key.includes('סוג') && key.includes('תמיכה') ? (
                      <select
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="">בחר סוג תמיכה</option>
                        <option value="חד-פעמית">חד-פעמית</option>
                        <option value="קבועה">קבועה</option>
                        <option value="קבועה לתקופה">קבועה לתקופה</option>
                      </select>
                    ) : (
                      <input
                        type={key.includes('סכום') || key.includes('amount') ? 'number' : 'text'}
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        required={isRequired}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder={`הזן ${header}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const resetData = {}
                  formHeaders.forEach((header) => {
                    const key = normalizeString(header)
                    resetData[key] = ''
                  })
                  setFormData(resetData)
                  setError('')
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                נקה טופס
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors font-medium"
              >
                שלח טופס
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SupportFormPage

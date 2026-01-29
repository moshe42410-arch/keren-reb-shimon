import React, { useState, useEffect } from 'react'
import { loadMaorotData, saveMaorotData } from '../services/maorotStorage'
import {
  normalizeString,
  findColumnIndex,
  buildSupportEntryFromRow,
  normalizeStatus,
} from '../utils/maorotUtils'

const SupportFormPage = () => {
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formHeaders, setFormHeaders] = useState([])

  useEffect(() => {
    // טוען את הכותרות מהנתונים הקיימים
    const maorotData = loadMaorotData()
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

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
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

      // מוסיף קטגוריה "ממתין לאישור" ב-rawRow
      const categoryIndex = findColumnIndex(formHeaders, ['קטגוריה', 'category'], null)
      const updatedRow = [...row]
      const updatedHeaders = [...formHeaders]
      
      if (categoryIndex !== null) {
        updatedRow[categoryIndex] = 'ממתין לאישור'
      } else {
        // אם אין עמודת קטגוריה, נוסיף אותה
        updatedHeaders.push('קטגוריה')
        updatedRow.push('ממתין לאישור')
      }

      // בונה תמיכה מחדש עם הקטגוריה
      const entryWithCategory = buildSupportEntryFromRow(
        updatedHeaders,
        updatedRow,
        columnMapping
      )

      // מוסיף קטגוריה "ממתין לאישור"
      const entryWithPending = {
        ...entryWithCategory,
        status: normalizeStatus(entryWithCategory.status) || 'פעיל',
        pendingApproval: true,
        rawRow: updatedRow,
        rawData: {
          ...entryWithCategory.rawData,
          קטגוריה: 'ממתין לאישור',
        },
      }

      // מוסיף את התמיכה לרשימה
      const updatedSupports = [...(maorotData.supports || []), entryWithPending]
      const updatedData = {
        ...maorotData,
        supports: updatedSupports,
      }

      saveMaorotData(updatedData)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">טופס הוספת תמיכה</h1>
          <p className="text-sm text-gray-500 mb-6">
            מלא את הפרטים הבאים כדי להוסיף תמיכה חדשה. התמיכה תתווסף עם קטגוריה "ממתין לאישור" ותאושר על ידי מנהל המערכת.
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {submitted && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              הטופס נשלח בהצלחה! התמיכה נוספה עם קטגוריה "ממתין לאישור" ותאושר על ידי מנהל המערכת.
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

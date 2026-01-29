import React, { useMemo, useState } from 'react'
import {
  buildReturnFileRows,
  buildReturnFileRowsYearly,
  normalizeIdentifier,
  normalizeString,
  parseAmount,
  readSpreadsheetFile,
  RETURN_FILE_MAPPING,
} from '../../utils/maorotUtils'
import { exportToExcel } from '../../services/exportUtils'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

const ReturnUploadTab = ({
  lastGeneratedFileRows,
  lastGeneratedMonthKey,
  returnFileRows,
  validationResults,
  directoryEntries,
  onReturnFileRowsChange,
  onValidationResultsChange,
  onDirectoryChange,
}) => {
  const [draftRows, setDraftRows] = useState([])
  const [draftResults, setDraftResults] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fileFormat, setFileFormat] = useState('monthly') // 'monthly' or 'yearly'
  const [yearDialogOpen, setYearDialogOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [pendingFileData, setPendingFileData] = useState(null)

  const baselineRows = lastGeneratedFileRows || []
  const baselineKey = lastGeneratedMonthKey || ''

  const getIdentifiers = (row) => {
    const identifiers = [
      normalizeIdentifier(row.idNumber),
      normalizeIdentifier(row.generalSupplierNumber),
      normalizeIdentifier(row.maorotSupplierNumber),
    ].filter(Boolean)
    return new Set(identifiers)
  }

  const compareRows = (generatedRows, returnRows) => {
    const returnIndex = returnRows.map((row) => ({
      row,
      ids: getIdentifiers(row),
      amount: parseAmount(row.amount),
    }))

    const generatedIndex = generatedRows.map((row) => ({
      row,
      ids: getIdentifiers(row),
      amount: parseAmount(row.amount),
    }))

    const matchByIds = (target, pool) => {
      return pool.find((entry) => {
        for (const id of target.ids) {
          if (entry.ids.has(id)) return true
        }
        return false
      })
    }

    const missingInReturn = generatedIndex
      .filter((entry) => {
        const match = matchByIds(entry, returnIndex)
        if (!match) return true
        return entry.amount !== match.amount
      })
      .map((entry) => entry.row)

    const missingInGenerated = returnIndex
      .filter((entry) => {
        const match = matchByIds(entry, generatedIndex)
        if (!match) return true
        return entry.amount !== match.amount
      })
      .map((entry) => entry.row)

    return { missingInReturn, missingInGenerated }
  }

  const handleDownloadExample = () => {
    if (fileFormat === 'monthly') {
      // דוגמא לפורמט חודשי
      const exampleData = [
        {
          'מ.ז': '123456789',
          'מס\' ספק כולל': '5555',
          'מס\' ספק מאורות': '6666',
          'שם': 'ישראל ישראלי',
          'תאריך': '01/01/2024',
          'סכום': 1000
        },
        {
          'מ.ז': '987654321',
          'מס\' ספק כולל': '7777',
          'מס\' ספק מאורות': '8888',
          'שם': 'שרה כהן',
          'תאריך': '15/01/2024',
          'סכום': 2000
        }
      ]
      exportToExcel(exampleData, 'דוגמא', 'פורמט_קובץ_חודשי_לדוגמא.xlsx')
    } else {
      // דוגמא לפורמט שנתי
      const exampleData = [
        {
          'מספר ספק כולל': '5555',
          'מספר ספק מאורות': '6666',
          'ת.ז': '123456789',
          'שם': 'ישראל ישראלי',
          '01': 1000,
          '02': 1500,
          '03': 2000,
          '04': '',
          '05': '',
          '06': 3000
        },
        {
          'מספר ספק כולל': '7777',
          'מספר ספק מאורות': '8888',
          'ת.ז': '987654321',
          'שם': 'שרה כהן',
          '01': 2500,
          '02': '',
          '03': 3000,
          '04': 3500,
          '05': 4000,
          '06': ''
        }
      ]
      exportToExcel(exampleData, 'דוגמא', 'פורמט_קובץ_שנתי_לדוגמא.xlsx')
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setNotice('')
    const hasBaseline = baselineRows.length > 0
    if (!hasBaseline) {
      setNotice('אין קובץ לבדיקה. הקובץ החוזר יישמר ללא בדיקת התאמה.')
    }
    setLoading(true)
    try {
      const { rawData } = await readSpreadsheetFile(file)
      
      // אם זה פורמט שנתי, צריך לבדוק אם יש צורך בשנה
      if (fileFormat === 'yearly') {
        // בודק אם יש ציון שנה בכותרות
        const headers = rawData[0] || []
        let hasYearInHeaders = false
        let extractedYear = null
        
        // בודק אם יש כותרת שמכילה שנה (4 ספרות) - פורמטים כמו "07/2024", "2024-07", "07-2024", "2024"
        for (const header of headers) {
          const headerStr = normalizeString(header)
          // בודק אם יש פורמט עם שנה (4 ספרות)
          const yearMatch = headerStr.match(/(\d{4})/)
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10)
            // בודק אם השנה סבירה (למשל בין 2000 ל-2100)
            if (year >= 2000 && year <= 2100) {
              hasYearInHeaders = true
              extractedYear = year
              break
            }
          }
        }
        
        // אם לא מצאנו שנה, בודקים אם יש כותרות שהם רק חודשים (1-12) ללא שנה
        // אם כן, צריך לבקש מהמשתמש לבחור שנה
        if (!hasYearInHeaders) {
          let hasMonthOnlyHeaders = false
          for (const header of headers) {
            const headerStr = normalizeString(header)
            // בודק אם זה רק מספר חודש (1-12) ללא שנה
            const monthOnlyMatch = headerStr.match(/^(\d{1,2})$/)
            if (monthOnlyMatch) {
              const monthNum = parseInt(monthOnlyMatch[1], 10)
              if (monthNum >= 1 && monthNum <= 12) {
                hasMonthOnlyHeaders = true
                break
              }
            }
          }
          
          // אם יש כותרות חודש בלבד, מציגים דיאלוג לבחירת שנה
          if (hasMonthOnlyHeaders) {
            setPendingFileData(rawData)
            setYearDialogOpen(true)
            setLoading(false)
            return
          }
        }
        
        // אם יש שנה בכותרות, משתמשים בה
        const rows = buildReturnFileRowsYearly(rawData, extractedYear || new Date().getFullYear())
        const results = hasBaseline
          ? compareRows(baselineRows, rows)
          : { missingInReturn: [], missingInGenerated: [] }
        setDraftRows(rows)
        setDraftResults(results)
        
        if (hasBaseline && results.missingInGenerated.length > 0 && directoryEntries) {
          const existingIds = new Set(
            directoryEntries.map((entry) => normalizeIdentifier(entry.idNumber))
          )
          const newEntries = results.missingInGenerated
            .filter((row) => {
              const id = normalizeIdentifier(row.idNumber)
              return id && !existingIds.has(id)
            })
            .map((row) => ({
              id: `${Date.now()}-${Math.random()}`,
              idNumber: row.idNumber,
              generalSupplierNumber: row.generalSupplierNumber,
              maorotSupplierNumber: row.maorotSupplierNumber,
              name: row.name,
              bankNumber: '',
              branchNumber: '',
              accountNumber: '',
              rawRow: row.rawRow,
            }))
          if (newEntries.length > 0) {
            onDirectoryChange?.([...directoryEntries, ...newEntries])
          }
        }
      } else {
        // פורמט חודשי
        const rows = buildReturnFileRows(rawData, RETURN_FILE_MAPPING)
        const results = hasBaseline
          ? compareRows(baselineRows, rows)
          : { missingInReturn: [], missingInGenerated: [] }
        setDraftRows(rows)
        setDraftResults(results)

        if (hasBaseline && results.missingInGenerated.length > 0 && directoryEntries) {
          const existingIds = new Set(
            directoryEntries.map((entry) => normalizeIdentifier(entry.idNumber))
          )
          const newEntries = results.missingInGenerated
            .filter((row) => {
              const id = normalizeIdentifier(row.idNumber)
              return id && !existingIds.has(id)
            })
            .map((row) => ({
              id: `${Date.now()}-${Math.random()}`,
              idNumber: row.idNumber,
              generalSupplierNumber: row.generalSupplierNumber,
              maorotSupplierNumber: row.maorotSupplierNumber,
              name: row.name,
              bankNumber: '',
              branchNumber: '',
              accountNumber: '',
              rawRow: row.rawRow,
            }))
          if (newEntries.length > 0) {
            onDirectoryChange?.([...directoryEntries, ...newEntries])
          }
        }
      }
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ החוזר.')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleYearConfirm = () => {
    if (!pendingFileData) {
      setYearDialogOpen(false)
      return
    }
    
    setLoading(true)
    try {
      const rows = buildReturnFileRowsYearly(pendingFileData, selectedYear)
      const hasBaseline = baselineRows.length > 0
      const results = hasBaseline
        ? compareRows(baselineRows, rows)
        : { missingInReturn: [], missingInGenerated: [] }
      setDraftRows(rows)
      setDraftResults(results)

      if (hasBaseline && results.missingInGenerated.length > 0 && directoryEntries) {
        const existingIds = new Set(
          directoryEntries.map((entry) => normalizeIdentifier(entry.idNumber))
        )
        const newEntries = results.missingInGenerated
          .filter((row) => {
            const id = normalizeIdentifier(row.idNumber)
            return id && !existingIds.has(id)
          })
          .map((row) => ({
            id: `${Date.now()}-${Math.random()}`,
            idNumber: row.idNumber,
            generalSupplierNumber: row.generalSupplierNumber,
            maorotSupplierNumber: row.maorotSupplierNumber,
            name: row.name,
            bankNumber: '',
            branchNumber: '',
            accountNumber: '',
            rawRow: row.rawRow,
          }))
        if (newEntries.length > 0) {
          onDirectoryChange?.([...directoryEntries, ...newEntries])
        }
      }
      
      setYearDialogOpen(false)
      setPendingFileData(null)
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ החוזר.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setDraftRows([])
    setDraftResults(null)
    setError('')
    setNotice('')
    onReturnFileRowsChange?.([])
    onValidationResultsChange?.({ missingInReturn: [], missingInGenerated: [] })
  }

  const handleSave = () => {
    if (!draftRows.length || !draftResults) {
      setError('אין נתונים לשמירה.')
      return
    }
    onReturnFileRowsChange?.(draftRows)
    onValidationResultsChange?.(draftResults)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const savedResults = validationResults || { missingInReturn: [], missingInGenerated: [] }
  const activeResults = draftResults || savedResults

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">העלאת נתונים</h1>
        <p className="text-sm text-gray-500 mb-6">
          העלאת קובץ חוזר ובדיקת התאמה מול קובץ המחולל.
        </p>

        {/* בחירת פורמט */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר פורמט קובץ
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fileFormat"
                value="monthly"
                checked={fileFormat === 'monthly'}
                onChange={(e) => setFileFormat(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">פורמט חודשי (שורה לכל תנועה)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fileFormat"
                value="yearly"
                checked={fileFormat === 'yearly'}
                onChange={(e) => setFileFormat(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">פורמט שנתי (עמודות חודשיות)</span>
            </label>
          </div>
        </div>

        {/* הורדת דוגמא */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleDownloadExample}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            📥 הורד פורמט קובץ לדוגמא
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר קובץ חוזר (Excel)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="return-file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>{loading ? 'טוען...' : 'העלה קובץ'}</span>
                  <input
                    id="return-file-upload"
                    name="return-file-upload"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleUpload}
                  />
                </label>
                <p className="pr-1">או גרור ושחרר</p>
              </div>
            </div>
          </div>
        </div>

        {baselineKey ? (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            קובץ לבדיקה לחודש: {baselineKey}
          </div>
        ) : (
          <div className="mb-4 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
            טרם הוגדר קובץ לבדיקה במחולל התמיכות.
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
            {notice}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            הנתונים נשמרו בהצלחה!
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            שמור נתונים
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            איפוס נתוני קובץ
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">תוצאות בדיקה</h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">שורות בקובץ החוזר:</span>{' '}
              <span className="text-blue-700 font-bold">{draftRows.length}</span>
            </div>
            <div>
              <span className="font-medium">חסרות בקובץ החוזר:</span>{' '}
              <span className="text-orange-700 font-bold">{activeResults.missingInReturn?.length || 0}</span>
            </div>
            <div>
              <span className="font-medium">חסרות בקובץ המחולל:</span>{' '}
              <span className="text-red-700 font-bold">{activeResults.missingInGenerated?.length || 0}</span>
            </div>
            <div>
              <span className="font-medium">כרטיסים חדשים באלפון:</span>{' '}
              <span className="text-green-700 font-bold">
                {activeResults.missingInGenerated?.length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">
              חסרים בקובץ החוזר ({activeResults.missingInReturn?.length || 0})
            </h4>
            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-orange-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-right">מ.ז</th>
                    <th className="px-2 py-1 text-right">שם</th>
                    <th className="px-2 py-1 text-right">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {activeResults.missingInReturn?.length ? (
                    activeResults.missingInReturn.map((row, index) => (
                      <tr key={`${row.idNumber}-${index}`} className="border-b border-orange-200">
                        <td className="px-2 py-1">{row.idNumber || '-'}</td>
                        <td className="px-2 py-1">{row.name || '-'}</td>
                        <td className="px-2 py-1">{row.amount || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 text-center text-gray-500">
                        אין חסרים.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">
              חסרים בקובץ המחולל ({activeResults.missingInGenerated?.length || 0})
            </h4>
            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-purple-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-right">מ.ז</th>
                    <th className="px-2 py-1 text-right">שם</th>
                    <th className="px-2 py-1 text-right">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {activeResults.missingInGenerated?.length ? (
                    activeResults.missingInGenerated.map((row, index) => (
                      <tr key={`${row.idNumber}-${index}`} className="border-b border-purple-200">
                        <td className="px-2 py-1">{row.idNumber || '-'}</td>
                        <td className="px-2 py-1">{row.name || '-'}</td>
                        <td className="px-2 py-1">{row.amount || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 text-center text-gray-500">
                        אין חסרים.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* דיאלוג בחירת שנה */}
      <Dialog
        open={yearDialogOpen}
        onClose={() => {
          setYearDialogOpen(false)
          setPendingFileData(null)
          setLoading(false)
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 700,
          pb: 2
        }}>
          בחר שנה
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText sx={{ mb: 3, fontSize: '1rem' }}>
            הקובץ מכיל עמודות חודשיות ללא ציון שנה. אנא בחר לאיזו שנה לשייך את הנתונים.
          </DialogContentText>
          <TextField
            fullWidth
            type="number"
            label="שנה"
            value={selectedYear}
            onChange={(e) => {
              const year = parseInt(e.target.value)
              if (year >= 2000 && year <= 2100) {
                setSelectedYear(year)
              }
            }}
            inputProps={{
              min: 2000,
              max: 2100,
              step: 1
            }}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={() => {
              setYearDialogOpen(false)
              setPendingFileData(null)
              setLoading(false)
            }}
            sx={{ color: 'text.secondary' }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleYearConfirm}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
              fontWeight: 700,
            }}
          >
            אישור
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ReturnUploadTab

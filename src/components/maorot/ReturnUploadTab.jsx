import React, { useMemo, useState } from 'react'
import {
  buildReturnFileRows,
  normalizeIdentifier,
  normalizeString,
  parseAmount,
  readSpreadsheetFile,
  RETURN_FILE_MAPPING,
} from '../../utils/maorotUtils'

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
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ החוזר.')
    } finally {
      setLoading(false)
      event.target.value = ''
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
    </div>
  )
}

export default ReturnUploadTab

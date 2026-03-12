import React, { useState, useEffect } from 'react'
import { useDataContext } from '../context/DataContext'
import { saveExcelData, hasExcelData, getAllFundsWithLabels, saveNewFund, getExcelData } from '../services/storageService'
import { processExcelData } from '../services/excelParser'
import { fetchAllCategoriesData, appendRowsToGoogleSheet, getSheetNames } from '../services/googleSheets'
import { syncData, checkForDuplicateFile, extractMonthFromDate } from '../services/syncService'
import { formatDateSafe } from '../utils/dateFormatter'
import * as XLSX from 'xlsx'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Button from '@mui/material/Button'

const UploadPage = () => {
  const { updateExcelData, updateProcessedData, updateSelectedFund, googleSheetsId } = useDataContext()
  const [file, setFile] = useState(null)
  const [fund, setFund] = useState('')
  const [month, setMonth] = useState('')
  const [funds, setFunds] = useState([])
  const [newFundName, setNewFundName] = useState('')
  const [showNewFundInput, setShowNewFundInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [pendingData, setPendingData] = useState(null)
  
  // סנכרון וממשק השוואה
  const [syncResults, setSyncResults] = useState(null)
  const [showSyncResults, setShowSyncResults] = useState(false)
  const [processingSync, setProcessingSync] = useState(false)
  const [currentProcessedData, setCurrentProcessedData] = useState(null)
  const [currentParsedData, setCurrentParsedData] = useState(null)
  const [showAllMissingGS, setShowAllMissingGS] = useState(false)
  const [showAllMissingExcel, setShowAllMissingExcel] = useState(false)
  const [showAllRowsWithoutId, setShowAllRowsWithoutId] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sendingToGS, setSendingToGS] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const loadFunds = () => {
      const allFunds = getAllFundsWithLabels()
      setFunds(allFunds)
    }
    
    loadFunds()
    window.addEventListener('fundsUpdated', loadFunds)
    return () => window.removeEventListener('fundsUpdated', loadFunds)
  }, [])

  const extractMonthFromFile = (fileName) => {
    const dateMatch = fileName.match(/(\d{1,2})[\/\-](\d{2,4})/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1])
      const year = parseInt(dateMatch[2])
      const fullYear = year < 100 ? 2000 + year : year
      return `${String(month).padStart(2, '0')}/${fullYear}`
    }
    return ''
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const extractedMonth = extractMonthFromFile(selectedFile.name)
      if (extractedMonth) setMonth(extractedMonth)
      setError('')
      setSuccess(false)
      setSyncResults(null)
      setShowSyncResults(false)
    }
    setTimeout(() => { if (e.target) e.target.value = '' }, 100)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      const extractedMonth = extractMonthFromFile(droppedFile.name)
      if (extractedMonth) setMonth(extractedMonth)
      setError('')
      setSuccess(false)
    }
  }

  const processAndSync = async (parsed, processed, fundName, monthKey) => {
    try {
      setProcessingSync(true)
      setError('')
      const googleSheetsData = await fetchAllCategoriesData(googleSheetsId)
      const syncResult = syncData(processed, googleSheetsData, fundName, monthKey)
      setSyncResults(syncResult)
      setShowSyncResults(true)
      setCurrentProcessedData(processed)
      setCurrentParsedData(parsed)
      return syncResult
    } catch (err) {
      setError(`שגיאה בסנכרון: ${err.message}`)
      throw err
    } finally {
      setProcessingSync(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !fund || !month) {
      setError('אנא בחר קובץ, קרן וחודש')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)
    setSyncResults(null)
    setShowSyncResults(false)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsed = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
      const processed = processExcelData(parsed)

      if (hasExcelData(fund, month)) {
        const existingData = getExcelData(fund, month)
        if (existingData?.processedData) {
          const hasSupportRows = existingData.processedData.rows?.some(row => {
            const typeStr = String(row.type || '').trim().toLowerCase()
            return typeStr.includes('תמיכות') || typeStr.includes('תמיכה') || typeStr.includes('support')
          })
          const hasNewSupportRows = processed.rows?.some(row => {
            const typeStr = String(row.type || '').trim().toLowerCase()
            return typeStr.includes('תמיכות') || typeStr.includes('תמיכה') || typeStr.includes('support')
          })
          if (hasSupportRows || hasNewSupportRows) {
            setPendingData({ parsed, processed, fund, month })
            setDuplicateDialogOpen(true)
            setLoading(false)
            return
          }
        }
      }

      await processAndSync(parsed, processed, fund, month)
      setLoading(false)
    } catch (err) {
      setError(`שגיאה בעיבוד הקובץ: ${err.message}`)
      setLoading(false)
    }
  }

  const handleReprocess = async () => {
    if (!currentProcessedData || !currentParsedData || !fund || !month) {
      setError('אין נתונים לעיבוד מחדש')
      return
    }
    setProcessingSync(true)
    setError('')
    try {
      await processAndSync(currentParsedData, currentProcessedData, fund, month)
    } catch (err) {
      setError(`שגיאה בעיבוד מחדש: ${err.message}`)
    } finally {
      setProcessingSync(false)
    }
  }

  const saveDataAndUpdate = async (parsed, processed, fundName, monthKey, syncResult = null) => {
    try {
      saveExcelData(fundName, monthKey, {
        excelData: parsed,
        processedData: processed,
        syncResults: syncResult,
        uploadedAt: new Date().toISOString(),
        fileName: file?.name || '',
        fund: fundName,
        month: monthKey,
      })
      updateExcelData(parsed)
      updateProcessedData(processed)
      updateSelectedFund(fundName)
      const allFunds = getAllFundsWithLabels()
      setFunds(allFunds)
      setSuccess(true)
      setDuplicateDialogOpen(false)
      setPendingData(null)
      setTimeout(() => {
        setFile(null)
        setMonth('')
        setFund('')
        setSyncResults(null)
        setShowSyncResults(false)
        setCurrentProcessedData(null)
        setCurrentParsedData(null)
        setSuccess(false)
        setSaveSuccess(false)
        const fileInput = document.getElementById('file-upload')
        if (fileInput) fileInput.value = ''
      }, 2500)
    } catch (err) {
      setError(`שגיאה בשמירת הנתונים: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
      setProcessingSync(false)
    }
  }

  const handleDuplicateConfirm = async () => {
    if (!pendingData) {
      setDuplicateDialogOpen(false)
      setPendingData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setDuplicateDialogOpen(false)
    try {
      await processAndSync(pendingData.parsed, pendingData.processed, pendingData.fund, pendingData.month)
      setPendingData(null)
      setLoading(false)
    } catch (err) {
      setError(`שגיאה בעיבוד הקובץ: ${err.message}`)
      setLoading(false)
      setPendingData(null)
    }
  }

  const handleSaveNewFund = () => {
    if (newFundName?.trim()) {
      try {
        saveNewFund(newFundName.trim())
        setFund(newFundName.trim())
        const allFunds = getAllFundsWithLabels()
        setFunds(allFunds)
        setShowNewFundInput(false)
        setNewFundName('')
      } catch (err) {
        setError(`שגיאה בשמירת קרן חדשה: ${err.message}`)
      }
    } else {
      setError('אנא הזן שם קרן')
    }
  }

  const handleFinalSave = async () => {
    if (!currentParsedData || !currentProcessedData || !fund || !month) {
      setError('אין נתונים לשמירה')
      return
    }
    setLoading(true)
    setError('')
    setSaveSuccess(false)
    try {
      await saveDataAndUpdate(currentParsedData, currentProcessedData, fund, month, syncResults)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(`שגיאה בשמירת הנתונים: ${err.message}`)
      setLoading(false)
    }
  }

  const handleCheckUpdates = async () => {
    if (!currentProcessedData || !currentParsedData || !fund || !month) {
      setError('אין נתונים לבדיקת עדכונים')
      return
    }
    if (!googleSheetsId) {
      setError('חסר מזהה גוגל שיטס')
      return
    }
    setSendingToGS(true)
    setError('')
    setSendSuccess(null)
    try {
      await processAndSync(currentParsedData, currentProcessedData, fund, month)
      setSendSuccess({ message: 'הבדיקה הושלמה בהצלחה!' })
      setTimeout(() => setSendSuccess(null), 3000)
    } catch (err) {
      setError(`שגיאה בבדיקת עדכונים: ${err.message}`)
    } finally {
      setSendingToGS(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">העלאת נתונים</h1>
        <p className="text-gray-500">העלאת קובץ Excel לעיבוד וסנכרון מול גוגל שיטס</p>
      </div>

      {/* Steps Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { step: 1, title: 'בחירת קרן וחודש', desc: 'בחר את הקרן והחודש לשיוך', color: 'teal' },
          { step: 2, title: 'העלאת קובץ', desc: 'גרור ושחרר או לחץ לבחירה', color: 'blue' },
          { step: 3, title: 'סנכרון ושמירה', desc: 'בדיקת נתונים ושמירה במערכת', color: 'emerald' },
        ].map(({ step, title, desc, color }) => (
          <div key={step} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center flex-shrink-0`}>
              <span className={`text-${color}-600 font-bold text-lg`}>{step}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Fund & Month Selection */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Fund */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">קרן</label>
              <select
                value={fund}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '__NEW__') {
                    setShowNewFundInput(true)
                    setFund('')
                  } else {
                    setFund(value)
                    setShowNewFundInput(false)
                    setNewFundName('')
                  }
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
              >
                <option value="">-- בחר קרן --</option>
                {funds.map((f) => {
                  const fv = typeof f === 'string' ? f : f.value
                  const fl = typeof f === 'string' ? f : f.label
                  return <option key={fv} value={fv}>{fl}</option>
                })}
                <option value="__NEW__">+ הוסף קרן חדשה</option>
              </select>

              {showNewFundInput && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newFundName}
                    onChange={(e) => setNewFundName(e.target.value)}
                    placeholder="שם קרן חדשה"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                  <button
                    onClick={handleSaveNewFund}
                    className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => { setShowNewFundInput(false); setNewFundName(''); setFund('') }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">חודש (MM/YYYY)</label>
              <input
                type="text"
                value={month}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '')
                  if (value.length > 6) value = value.substring(0, 6)
                  if (value.length >= 2) {
                    value = `${value.substring(0, 2)}/${value.substring(2)}`
                  }
                  setMonth(value)
                }}
                placeholder="01/2026"
                maxLength={7}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="p-6 border-b border-gray-100">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-teal-400 bg-teal-50' 
                : file 
                  ? 'border-teal-300 bg-teal-50/50' 
                  : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
            }`}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{file.name}</p>
                <p className="text-xs text-gray-500">לחץ להחלפת קובץ</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">גרור ושחרר את הקובץ כאן</p>
                <p className="text-xs text-gray-500">או לחץ לבחירת קובץ מהמחשב</p>
                <p className="text-xs text-gray-400 mt-2">קבצים נתמכים: .xlsx, .xls</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-emerald-700 font-medium">הקובץ נטען בהצלחה!</span>
          </div>
        )}

        {/* Action Button */}
        <div className="p-6">
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || processingSync || !file || !fund || !month}
              className="flex-1 px-6 py-3.5 bg-gradient-to-l from-teal-600 to-teal-500 text-white rounded-xl font-semibold text-sm hover:from-teal-700 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 flex items-center justify-center gap-2"
            >
              {(loading || processingSync) ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{loading ? 'מעבד...' : 'מסנכרן...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span>העלה וסנכרן קובץ</span>
                </>
              )}
            </button>
            
            {showSyncResults && currentProcessedData && (
              <button
                onClick={handleReprocess}
                disabled={processingSync}
                className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {processingSync ? 'מעבד...' : 'עיבוד חוזר'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sync Results */}
      {showSyncResults && syncResults && (
        <div className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'שורות מסונכרנות', value: syncResults.syncedRows.length, color: 'emerald', icon: '✓' },
              { label: 'חסרות בגוגל שיטס', value: syncResults.missingInGoogleSheets.length, color: 'amber', icon: '!' },
              { label: 'חסרות באקסל', value: syncResults.missingInExcel.length, color: 'red', icon: '✕' },
              { label: 'ללא זיהוי מלא', value: syncResults.rowsWithoutFullId?.length || 0, color: 'purple', icon: '?' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center text-${color}-600 font-bold text-sm`}>
                    {icon}
                  </span>
                  <span className={`text-2xl font-bold text-${color}-600`}>{value}</span>
                </div>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Missing in Google Sheets */}
          {syncResults.missingInGoogleSheets.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-amber-50 flex justify-between items-center border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 text-sm">חסרות בגוגל שיטס</h4>
                    <p className="text-xs text-amber-600">{syncResults.missingInGoogleSheets.length} שורות</p>
                  </div>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={sendingToGS || !googleSheetsId}
                  className="px-4 py-2 bg-white text-blue-600 text-xs font-medium rounded-lg border border-blue-200 hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {sendingToGS ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  )}
                  בדוק עדכונים
                </button>
              </div>
              {sendSuccess && (
                <div className="mx-5 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs">✓ {sendSuccess.message}</div>
              )}
              <div className={showAllMissingGS ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['שורה', 'סוג תנועה', 'מ.ז', 'שם', 'סכום', 'תאריך'].map(h => (
                        <th key={h} className="px-4 py-3 text-right font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(showAllMissingGS ? syncResults.missingInGoogleSheets : syncResults.missingInGoogleSheets.slice(0, 10)).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{row.rowIndex}</td>
                        <td className="px-4 py-2.5">{row.type || '-'}</td>
                        <td className="px-4 py-2.5 font-mono">{row.idNumber || '-'}</td>
                        <td className="px-4 py-2.5">{row.name || '-'}</td>
                        <td className="px-4 py-2.5 font-mono">{row.amount?.toFixed(2) || '-'}</td>
                        <td className="px-4 py-2.5">{formatDateSafe(row.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {syncResults.missingInGoogleSheets.length > 10 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button onClick={() => setShowAllMissingGS(!showAllMissingGS)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {showAllMissingGS ? 'הצג פחות' : `הצג הכל (${syncResults.missingInGoogleSheets.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rows Without Full ID */}
          {syncResults.rowsWithoutFullId?.length > 0 && (
            <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
                <h4 className="font-semibold text-purple-900 text-sm">שורות ללא מזהה מלא ({syncResults.rowsWithoutFullId.length})</h4>
              </div>
              <div className={showAllRowsWithoutId ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['שורה', 'מ.ז', 'שם', 'סכום', 'תאריך', 'קרן', 'חסר'].map(h => (
                        <th key={h} className="px-4 py-3 text-right font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(showAllRowsWithoutId ? syncResults.rowsWithoutFullId : syncResults.rowsWithoutFullId.slice(0, 10)).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{row.rowIndex}</td>
                        <td className="px-4 py-2.5 font-mono">{row.id || '-'}</td>
                        <td className="px-4 py-2.5">{row.name || '-'}</td>
                        <td className="px-4 py-2.5 font-mono">{row.amount?.toFixed(2) || '-'}</td>
                        <td className="px-4 py-2.5">{row.month || '-'}</td>
                        <td className="px-4 py-2.5">{row.fund || '-'}</td>
                        <td className="px-4 py-2.5 text-red-600 font-medium">{row.missingParts || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {syncResults.rowsWithoutFullId.length > 10 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button onClick={() => setShowAllRowsWithoutId(!showAllRowsWithoutId)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {showAllRowsWithoutId ? 'הצג פחות' : `הצג הכל (${syncResults.rowsWithoutFullId.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Missing in Excel */}
          {syncResults.missingInExcel?.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-red-50 border-b border-red-100">
                <h4 className="font-semibold text-red-900 text-sm">תמיכות חסרות באקסל ({syncResults.missingInExcel.length})</h4>
              </div>
              <div className={showAllMissingExcel ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['שורה', 'מ.ז', 'שם', 'סכום', 'חודש', 'קרן', 'קטגוריה'].map(h => (
                        <th key={h} className="px-4 py-3 text-right font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(showAllMissingExcel ? syncResults.missingInExcel : syncResults.missingInExcel.slice(0, 10)).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{row.rowIndex}</td>
                        <td className="px-4 py-2.5 font-mono">{row.id || '-'}</td>
                        <td className="px-4 py-2.5">{row.name || '-'}</td>
                        <td className="px-4 py-2.5 font-mono">{row.amount?.toFixed(2) || '-'}</td>
                        <td className="px-4 py-2.5">{row.month || '-'}</td>
                        <td className="px-4 py-2.5">{row.fund || '-'}</td>
                        <td className="px-4 py-2.5">{row.category || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {syncResults.missingInExcel.length > 10 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button onClick={() => setShowAllMissingExcel(!showAllMissingExcel)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {showAllMissingExcel ? 'הצג פחות' : `הצג הכל (${syncResults.missingInExcel.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end items-center gap-4">
            {saveSuccess && (
              <div className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-medium">הקובץ נשמר בהצלחה!</span>
              </div>
            )}
            <button
              onClick={handleFinalSave}
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'שומר...' : 'שמור נתונים'}
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 0, minWidth: 350, maxWidth: 450 } }}>
        <DialogContent sx={{ textAlign: 'center', py: 4, px: 4 }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <DialogContentText sx={{ fontSize: 16, fontWeight: 500, color: '#1f2937', mb: 3 }}>הקובץ עלה למערכת בהצלחה!</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 4 }}>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained" sx={{ backgroundColor: '#0d9488', '&:hover': { backgroundColor: '#0f766e' }, borderRadius: 2.5, px: 4, textTransform: 'none', fontWeight: 600 }}>אישור</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={duplicateDialogOpen} onClose={() => { setDuplicateDialogOpen(false); setPendingData(null); setLoading(false) }} PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>קובץ קיים</DialogTitle>
        <DialogContent>
          <DialogContentText>נמצא קובץ עם אותה קרן וחודש. האם ברצונך לדרוס את הנתונים הקיימים?</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDuplicateDialogOpen(false); setPendingData(null); setLoading(false) }} sx={{ borderRadius: 2, textTransform: 'none' }}>ביטול</Button>
          <Button onClick={handleDuplicateConfirm} variant="contained" sx={{ bgcolor: '#0d9488', '&:hover': { bgcolor: '#0f766e' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>אישור ודריסה</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default UploadPage

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

  useEffect(() => {
    const loadFunds = () => {
      const allFunds = getAllFundsWithLabels()
      setFunds(allFunds)
    }
    
    loadFunds()
    
    // האזנה לעדכוני קרנות
    window.addEventListener('fundsUpdated', loadFunds)
    
    return () => {
      window.removeEventListener('fundsUpdated', loadFunds)
    }
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
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const extractedMonth = extractMonthFromFile(selectedFile.name)
      if (extractedMonth) {
        setMonth(extractedMonth)
      }
      setError('')
      setSuccess(false)
      setSyncResults(null)
      setShowSyncResults(false)
    }
  }

  const processAndSync = async (parsed, processed, fundName, monthKey) => {
    try {
      setProcessingSync(true)
      setError('')
      
      // קריאה מ-Google Sheets
      console.log('קורא נתונים מ-Google Sheets...')
      const googleSheetsData = await fetchAllCategoriesData(googleSheetsId)
      
      // סנכרון הנתונים
      console.log('מסנכרן נתונים...')
      const syncResult = syncData(processed, googleSheetsData, fundName, monthKey)
      setSyncResults(syncResult)
      setShowSyncResults(true)
      
      // שמירת הנתונים המעובדים
      setCurrentProcessedData(processed)
      setCurrentParsedData(parsed)
      
      console.log('סנכרון הושלם:', {
        synced: syncResult.syncedRows.length,
        missingInGS: syncResult.missingInGoogleSheets.length,
        missingInExcel: syncResult.missingInExcel.length,
      })
      
      return syncResult
    } catch (err) {
      console.error('Error in sync:', err)
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
      // קריאת הקובץ
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const parsed = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
      
      // עיבוד הנתונים
      const processed = processExcelData(parsed)

      // בדיקת כפילות - בדיקה אם קובץ זהה כבר עובד
      // **רק עבור שורות תמיכה נבדוק כפילויות**
      if (hasExcelData(fund, month)) {
        const existingData = getExcelData(fund, month)
        if (existingData && existingData.processedData) {
          // בודק אם יש שורות תמיכה בנתונים הקיימים
          const hasSupportRows = existingData.processedData.rows?.some(row => {
            if (!row.type) return false
            const typeStr = String(row.type).trim().toLowerCase()
            return typeStr.includes('תמיכות') || 
                   typeStr.includes('תמיכה') || 
                   typeStr.includes('support')
          })
          
          // בודק אם יש שורות תמיכה בקובץ החדש
          const hasNewSupportRows = processed.rows?.some(row => {
            if (!row.type) return false
            const typeStr = String(row.type).trim().toLowerCase()
            return typeStr.includes('תמיכות') || 
                   typeStr.includes('תמיכה') || 
                   typeStr.includes('support')
          })
          
          // מציג אזהרה רק אם יש שורות תמיכה
          if (hasSupportRows || hasNewSupportRows) {
            setPendingData({ parsed, processed, fund, month })
            setDuplicateDialogOpen(true)
            setLoading(false)
            return
          }
        }
      }

      // עיבוד וסנכרון
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
      // שמירה ב-localStorage
      // אם יש נתונים קיימים, הם ידרסו אוטומטית (saveExcelData מטפל בזה)
      saveExcelData(fundName, monthKey, {
        excelData: parsed,
        processedData: processed,
        syncResults: syncResult,
        uploadedAt: new Date().toISOString(),
        fileName: file?.name || '',
        fund: fundName,
        month: monthKey,
      })

      // מעדכן את ה-context
      updateExcelData(parsed)
      updateProcessedData(processed)
      updateSelectedFund(fundName)

      // מעדכן רשימת קרנות
      const allFunds = getAllFundsWithLabels()
      setFunds(allFunds)

      // מציג הודעת הצלחה בדיאלוג
      setSuccess(true)
      setDuplicateDialogOpen(false)
      setPendingData(null)
      
      // מנקה את הנתונים אחרי השמירה כדי לאפס את העמוד
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
        // איפוס input file
        const fileInput = document.getElementById('file-upload')
        if (fileInput) fileInput.value = ''
      }, 2500) // מחכה 2.5 שניות כדי שהמשתמש יראה את הודעת ההצלחה
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
      await processAndSync(
        pendingData.parsed,
        pendingData.processed,
        pendingData.fund,
        pendingData.month
      )
      setPendingData(null)
      setLoading(false)
    } catch (err) {
      setError(`שגיאה בעיבוד הקובץ: ${err.message}`)
      setLoading(false)
      setPendingData(null)
    }
  }

  const handleSaveNewFund = () => {
    if (newFundName && newFundName.trim()) {
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
      // הודעה תוצג למשך 3 שניות, ואז העמוד יתאפס
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (err) {
      setError(`שגיאה בשמירת הנתונים: ${err.message}`)
      setLoading(false)
    }
  }

  /**
   * בודק עדכונים - מריץ סנכרון מחדש ללא כתיבה לגוגל שיטס
   */
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
      // רענון הסנכרון בלבד - ללא כתיבה
      console.log('בודק עדכונים בגוגל שיטס...')
      await processAndSync(currentParsedData, currentProcessedData, fund, month)
      
      setSendSuccess({
        message: 'הבדיקה הושלמה בהצלחה!'
      })

      // הודעה תוצג למשך 3 שניות
      setTimeout(() => {
        setSendSuccess(null)
      }, 3000)

    } catch (err) {
      console.error('Error checking updates:', err)
      setError(`שגיאה בבדיקת עדכונים: ${err.message}`)
    } finally {
      setSendingToGS(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">העלאת נתונים</h1>

        {/* Upload Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר קובץ Excel
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
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>העלה קובץ</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pr-1">או גרור ושחרר</p>
              </div>
              {file && (
                <p className="text-xs text-gray-500 mt-2">{file.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Fund Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר קרן
          </label>
          <div className="flex gap-4">
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">-- בחר קרן --</option>
              {funds.map((f) => {
                const fundValue = typeof f === 'string' ? f : f.value
                const fundLabel = typeof f === 'string' ? f : f.label
                return (
                  <option key={fundValue} value={fundValue}>
                    {fundLabel}
                  </option>
                )
              })}
              <option value="__NEW__">+ הוסף קרן חדשה</option>
            </select>
          </div>

          {showNewFundInput && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newFundName}
                onChange={(e) => setNewFundName(e.target.value)}
                placeholder="הזן שם קרן חדשה"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveNewFund}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setShowNewFundInput(false)
                  setNewFundName('')
                  setFund('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          )}
        </div>

        {/* Month Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            חודש (MM/YYYY)
          </label>
          <input
            type="text"
            value={month}
            onChange={(e) => {
              let value = e.target.value.replace(/[^\d]/g, '') // רק מספרים
              
              // אם יש יותר מ-6 ספרות, נחתוך
              if (value.length > 6) {
                value = value.substring(0, 6)
              }
              
              // אם יש 2 ספרות או יותר, נוסיף לוכסן אחרי 2 ספרות ראשונות
              if (value.length >= 2) {
                const monthPart = value.substring(0, 2)
                const yearPart = value.substring(2)
                value = `${monthPart}/${yearPart}`
              }
              
              setMonth(value)
            }}
            placeholder="01/2024"
            maxLength={7}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">הקובץ נטען בהצלחה!</span>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleUpload}
            disabled={loading || processingSync || !file || !fund || !month}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {(loading || processingSync) && (
              <div className="flex items-center gap-2">
                {/* אייקון קובץ נטען מודרני */}
                <div className="relative">
                  <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <svg className="absolute top-0 left-0 w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span>{loading ? 'מעבד...' : 'מסנכרן...'}</span>
              </div>
            )}
            {!loading && !processingSync && 'העלה וסנכרן קובץ'}
          </button>
          
          {showSyncResults && currentProcessedData && (
            <button
              onClick={handleReprocess}
              disabled={processingSync}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {processingSync ? 'מעבד...' : 'עיבוד חוזר'}
            </button>
          )}
        </div>

        {/* Sync Results */}
        {showSyncResults && syncResults && (
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">תוצאות הסנכרון</h3>
              <p className="text-xs text-blue-700 mb-3">
                * הממשק השוואה מציג רק שורות שסוג תנועה הינו "תמיכה"
              </p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">שורות מסונכרנות:</span>{' '}
                  <span className="text-green-700 font-bold">{syncResults.syncedRows.length}</span>
                </div>
                <div>
                  <span className="font-medium">תמיכות חסרות בגוגל שיטס:</span>{' '}
                  <span className="text-orange-700 font-bold">{syncResults.missingInGoogleSheets.length}</span>
                </div>
                <div>
                  <span className="font-medium">חסרות באקסל:</span>{' '}
                  <span className="text-red-700 font-bold">{syncResults.missingInExcel.length}</span>
                </div>
                <div>
                  <span className="font-medium">שורות ללא זיהוי מלא:</span>{' '}
                  <span className="text-purple-700 font-bold">{syncResults.rowsWithoutFullId?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Missing in Google Sheets */}
            {syncResults.missingInGoogleSheets.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-orange-900">
                    שורות תמיכה באקסל שלא נמצאו בגוגל שיטס ({syncResults.missingInGoogleSheets.length})
                  </h4>
                  <button
                    onClick={handleCheckUpdates}
                    disabled={sendingToGS || !googleSheetsId || !currentProcessedData || !currentParsedData}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {sendingToGS ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        בודק...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        בדוק עדכונים
                      </>
                    )}
                  </button>
                </div>
                {sendSuccess && (
                  <div className="mb-3 px-4 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
                    ✓ {sendSuccess.message}
                  </div>
                )}
                <p className="text-xs text-orange-700 mb-3">
                  * הממשק השוואה מציג רק שורות שסוג תנועה הינו "תמיכה"
                </p>
                <div className={showAllMissingGS ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-orange-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-right">שורה</th>
                        <th className="px-2 py-1 text-right">סוג תנועה</th>
                        <th className="px-2 py-1 text-right">מ.ז</th>
                        <th className="px-2 py-1 text-right">שם</th>
                        <th className="px-2 py-1 text-right">סכום</th>
                        <th className="px-2 py-1 text-right">תאריך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllMissingGS ? syncResults.missingInGoogleSheets : syncResults.missingInGoogleSheets.slice(0, 10)).map((row, idx) => (
                        <tr key={idx} className="border-b border-orange-200">
                          <td className="px-2 py-1">{row.rowIndex}</td>
                          <td className="px-2 py-1">{row.type || '-'}</td>
                          <td className="px-2 py-1">{row.idNumber || '-'}</td>
                          <td className="px-2 py-1">{row.name || '-'}</td>
                          <td className="px-2 py-1">{row.amount?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1">{formatDateSafe(row.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {syncResults.missingInGoogleSheets.length > 10 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={() => setShowAllMissingGS(!showAllMissingGS)}
                        className="px-4 py-2 text-xs bg-orange-200 text-orange-800 rounded-md hover:bg-orange-300 transition-colors"
                      >
                        {showAllMissingGS 
                          ? 'הצג פחות (10 ראשונות)' 
                          : `הצג הכל (+ ${syncResults.missingInGoogleSheets.length - 10} שורות נוספות)`
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rows Without Full ID */}
            {syncResults.rowsWithoutFullId && syncResults.rowsWithoutFullId.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">
                  שורות בגוגל שיטס ללא מזהה מלא ({syncResults.rowsWithoutFullId.length})
                </h4>
                <div className={showAllRowsWithoutId ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-purple-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-right">שורה</th>
                        <th className="px-2 py-1 text-right">מ.ז</th>
                        <th className="px-2 py-1 text-right">שם</th>
                        <th className="px-2 py-1 text-right">סכום</th>
                        <th className="px-2 py-1 text-right">תאריך</th>
                        <th className="px-2 py-1 text-right">קרן</th>
                        <th className="px-2 py-1 text-right">חסר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllRowsWithoutId ? syncResults.rowsWithoutFullId : syncResults.rowsWithoutFullId.slice(0, 10)).map((row, idx) => (
                        <tr key={idx} className="border-b border-purple-200">
                          <td className="px-2 py-1">{row.rowIndex}</td>
                          <td className="px-2 py-1">{row.id || '-'}</td>
                          <td className="px-2 py-1">{row.name || '-'}</td>
                          <td className="px-2 py-1">{row.amount?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1">{row.month || '-'}</td>
                          <td className="px-2 py-1">{row.fund || '-'}</td>
                          <td className="px-2 py-1 text-red-600 font-medium">{row.missingParts || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {syncResults.rowsWithoutFullId.length > 10 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={() => setShowAllRowsWithoutId(!showAllRowsWithoutId)}
                        className="px-4 py-2 text-xs bg-purple-200 text-purple-800 rounded-md hover:bg-purple-300 transition-colors"
                      >
                        {showAllRowsWithoutId 
                          ? 'הצג פחות (10 ראשונות)' 
                          : `הצג הכל (+ ${syncResults.rowsWithoutFullId.length - 10} שורות נוספות)`
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Missing in Excel */}
            {syncResults.missingInExcel && syncResults.missingInExcel.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">
                  תמיכות חסרות באקסל ({syncResults.missingInExcel.length})
                </h4>
                <div className={showAllMissingExcel ? "max-h-96 overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                  <table className="min-w-full text-sm">
                    <thead className="bg-red-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-right">שורה</th>
                        <th className="px-2 py-1 text-right">מ.ז</th>
                        <th className="px-2 py-1 text-right">שם</th>
                        <th className="px-2 py-1 text-right">סכום</th>
                        <th className="px-2 py-1 text-right">חודש</th>
                        <th className="px-2 py-1 text-right">קרן</th>
                        <th className="px-2 py-1 text-right">קטגוריה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllMissingExcel ? syncResults.missingInExcel : syncResults.missingInExcel.slice(0, 10)).map((row, idx) => (
                        <tr key={idx} className="border-b border-red-200">
                          <td className="px-2 py-1">{row.rowIndex}</td>
                          <td className="px-2 py-1">{row.id || '-'}</td>
                          <td className="px-2 py-1">{row.name || '-'}</td>
                          <td className="px-2 py-1">{row.amount?.toFixed(2) || '-'}</td>
                          <td className="px-2 py-1">{row.month || '-'}</td>
                          <td className="px-2 py-1">{row.fund || '-'}</td>
                          <td className="px-2 py-1">{row.category || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {syncResults.missingInExcel.length > 10 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={() => setShowAllMissingExcel(!showAllMissingExcel)}
                        className="px-4 py-2 text-xs bg-red-200 text-red-800 rounded-md hover:bg-red-300 transition-colors"
                      >
                        {showAllMissingExcel 
                          ? 'הצג פחות (10 ראשונות)' 
                          : `הצג הכל (+ ${syncResults.missingInExcel.length - 10} שורות נוספות)`
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end items-center gap-4">
              {saveSuccess && (
                <div className="flex-1 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">הקובץ נשמר בהצלחה!</span>
                </div>
              )}
              <button
                onClick={handleFinalSave}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'שומר...' : 'שמור נתונים'}
              </button>
            </div>
          </div>
        )}

        {/* Success Dialog - חלון קופץ הצלחה */}
        <Dialog
          open={successDialogOpen}
          onClose={() => setSuccessDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              padding: 0,
              minWidth: '350px',
              maxWidth: '450px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }
          }}
        >
          <DialogContent sx={{ textAlign: 'center', py: 4, px: 4 }}>
            {/* אייקון הצלחה - עיצוב דומה לתמונה עם צבע ירוק */}
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              position: 'relative'
            }}>
              {/* סימן V הצלחה */}
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="white" opacity="0.2"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* הודעה - טקסט מרכזי */}
            <DialogContentText 
              sx={{ 
                fontSize: '16px', 
                fontWeight: 500, 
                color: '#1f2937',
                margin: 0,
                mb: 3,
                lineHeight: 1.5
              }}
            >
              הקובץ עלה למערכת בהצלחה!
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 4 }}>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              variant="contained"
              sx={{
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 500,
                px: 4,
                py: 1,
                borderRadius: 1.5,
                textTransform: 'none',
                fontSize: '15px',
                '&:hover': {
                  backgroundColor: '#2563eb',
                }
              }}
            >
              אישור
            </Button>
          </DialogActions>
        </Dialog>

        {/* Duplicate Dialog */}
        <Dialog
          open={duplicateDialogOpen}
          onClose={() => {
            setDuplicateDialogOpen(false)
            setPendingData(null)
            setLoading(false)
          }}
        >
          <DialogTitle>קובץ קיים</DialogTitle>
          <DialogContent>
            <DialogContentText>
              נמצא קובץ עם אותה קרן וחודש. האם ברצונך לדרוס את הנתונים הקיימים?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setDuplicateDialogOpen(false)
                setPendingData(null)
                setLoading(false)
              }}
              color="secondary"
            >
              ביטול
            </Button>
            <Button
              onClick={handleDuplicateConfirm}
              color="primary"
              variant="contained"
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
            >
              אישור ודריסה
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  )
}

export default UploadPage

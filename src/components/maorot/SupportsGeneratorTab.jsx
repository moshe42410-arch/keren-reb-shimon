import React, { useMemo, useState } from 'react'
import {
  getMonthKey,
  mapValuesToTemplate,
  normalizeStatus,
  normalizeSupportType,
  normalizeString,
  parseMonthKeyToDate,
  readSpreadsheetFile,
} from '../../utils/maorotUtils'
import { exportToExcel } from '../../services/exportUtils'
import { saveAs } from 'file-saver'
import { generateSupportRequestZip } from '../../services/supportRequestService'

const activeStatuses = ['פעיל']
const defaultRequestMapping = {
  idNumber: 'מ.ז',
  name: 'שם',
  amount: 'סכום',
  bankNumber: "מס' בנק",
  branchNumber: "מס' סניף",
  accountNumber: "מס' חשבון",
  maorotSupplierNumber: "מס' ספק מאורות",
  generalSupplierNumber: "מס' ספק כולל",
  supportType: 'סוג תמיכה',
  month: 'חודש',
}

const SupportsGeneratorTab = ({
  supports,
  supportsHeaders,
  supportsColumnMapping,
  extraSupports,
  exportedExtraSupports,
  exportLog,
  directoryEntries,
  lastGeneratedMonth,
  lastGeneratedMonthKey,
  lastGeneratedFileRows,
  supportRequestMapping,
  autoGenerateSupportRequests,
  onSupportsChange,
  onExtraSupportsChange,
  onExportedExtraSupportsChange,
  onExportLogChange,
  onLastGeneratedMonthChange,
  onLastGeneratedValidationChange,
  onSupportRequestMappingChange,
  onAutoGenerateSupportRequestsChange,
}) => {
  const [monthKey, setMonthKey] = useState(getMonthKey())
  const [templateHeaders, setTemplateHeaders] = useState(null)
  const [error, setError] = useState('')
  const [requestTemplateBuffer, setRequestTemplateBuffer] = useState(null)
  const [requestTemplateName, setRequestTemplateName] = useState('')
  const [requestStatus, setRequestStatus] = useState(null)
  const [requestLoading, setRequestLoading] = useState(false)
  const [lastExportedRows, setLastExportedRows] = useState([])
  const [lastExportedMonthKey, setLastExportedMonthKey] = useState('')
  const [validationError, setValidationError] = useState('')

  const normalizeId = (value) => normalizeString(value).replace(/\D/g, '')

  const directoryLookup = useMemo(() => {
    return directoryEntries.reduce((acc, entry) => {
      const rawId = normalizeString(entry.idNumber)
      const digitId = normalizeId(entry.idNumber)
      if (rawId) acc[rawId] = entry
      if (digitId) acc[digitId] = entry
      return acc
    }, {})
  }, [directoryEntries])

  const getDirectoryEntry = (idValue) => {
    const rawId = normalizeString(idValue)
    const digitId = normalizeId(idValue)
    return directoryLookup[rawId] || directoryLookup[digitId] || null
  }

  const activeSupports = useMemo(() => {
    const monthDate = parseMonthKeyToDate(monthKey)
    return supports.filter((support) => {
      const status = normalizeStatus(support.status)
      if (!activeStatuses.includes(status)) return false

      const supportType = normalizeSupportType(support.supportType)
      const validTypes = ['קבועה', 'חד-פעמית', 'קבועה לתקופה']
      if (!validTypes.includes(supportType)) return false

      const headerAmountIndex = supportsHeaders
        ? supportsHeaders.findIndex((header) => {
            const headerStr = String(header || '').toLowerCase()
            return ['סכום', 'amount', 'סך'].some((term) => headerStr.includes(term))
          })
        : -1
      const amountIndex = Number.isInteger(headerAmountIndex) && headerAmountIndex !== -1
        ? headerAmountIndex
        : supportsColumnMapping?.amountIndex
      const rawAmount =
        Number.isInteger(amountIndex) && Array.isArray(support.rawRow)
          ? support.rawRow[amountIndex]
          : support.amount
      const amountValue = Number(rawAmount) || 0
      if (amountValue <= 0) return false

      if (support.endDate && monthDate) {
        const endDate = new Date(support.endDate)
        if (!Number.isNaN(endDate.getTime()) && endDate < monthDate) {
          return false
        }
      }

      return true
    })
  }, [supports, monthKey, supportsColumnMapping, supportsHeaders])

  const supportsWithExtras = useMemo(() => {
    return [...activeSupports, ...extraSupports]
  }, [activeSupports, extraSupports])

  const supportsEligibleForMonth = useMemo(() => {
    return supportsWithExtras.filter((support) => {
      const supportType = normalizeSupportType(support.supportType)
      if (supportType === 'חד-פעמית') {
        return (support.exportedMonths || []).length === 0
      }
      if (supportType === 'קבועה לתקופה') {
        const remaining =
          support.periodRemaining ?? support.periodMonths ?? support.periods ?? 0
        return Number(remaining) > 0
      }
      return true
    })
  }, [supportsWithExtras])

  const oneTimeSupports = useMemo(() => {
    return supportsEligibleForMonth.filter(
      (support) => normalizeSupportType(support.supportType) === 'חד-פעמית'
    )
  }, [supportsEligibleForMonth])

  const supportsSummary = useMemo(() => {
    return {
      total: supports.length,
      active: activeSupports.length,
      extra: extraSupports.length,
      oneTime: oneTimeSupports.length,
    }
  }, [supports.length, activeSupports.length, extraSupports.length, oneTimeSupports.length])

  const supportsNotExportedThisMonth = useMemo(() => {
    return supportsEligibleForMonth.filter((support) => {
      const exportedMonths = support.exportedMonths || []
      return !exportedMonths.includes(monthKey)
    })
  }, [supportsEligibleForMonth, monthKey])

  const handleTemplateUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    try {
      const { rawData } = await readSpreadsheetFile(file)
      const headers = rawData[0] || []
      setTemplateHeaders(headers)
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את התבנית. ודא שזה Excel תקין.')
    } finally {
      event.target.value = ''
    }
  }

  const handleRequestTemplateUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setRequestLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      setRequestTemplateBuffer(buffer)
      setRequestTemplateName(file.name)
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את תבנית הבקשה.')
    } finally {
      setRequestLoading(false)
      event.target.value = ''
    }
  }

  const handleLoadProjectTemplate = async () => {
    setError('')
    setRequestLoading(true)
    try {
      const response = await fetch('/בקשת תמיכה פתוח.docx')
      if (!response.ok) {
        throw new Error('Template not found')
      }
      const buffer = await response.arrayBuffer()
      setRequestTemplateBuffer(buffer)
      setRequestTemplateName('בקשת תמיכה פתוח.docx')
    } catch (err) {
      console.error(err)
      setError('לא ניתן לטעון את התבנית מהפרויקט. נסה להעלות ידנית.')
    } finally {
      setRequestLoading(false)
    }
  }

  const handleGenerateSupportRequests = async (isAuto = false) => {
    if (!requestTemplateBuffer) {
      if (!isAuto) {
        setError('יש לטעון תבנית בקשת תמיכה לפני הפקה.')
      }
      return
    }
    if (oneTimeSupports.length === 0) {
      if (!isAuto) {
        setError('אין תמיכות חד-פעמיות להפקת בקשות.')
      }
      return
    }

    setRequestLoading(true)
    setRequestStatus(null)
    try {
      const { zipBlob, missingDirectoryIds, failedSupports } =
        await generateSupportRequestZip({
          templateArrayBuffer: requestTemplateBuffer,
          supports: oneTimeSupports,
          directoryLookup,
          mapping: supportRequestMapping || defaultRequestMapping,
          monthKey,
        })

      saveAs(
        zipBlob,
        `בקשות_תמיכה_${monthKey.replace('/', '-')}.zip`
      )

      setRequestStatus({
        generated: oneTimeSupports.length,
        missingDirectoryIds,
        failedSupports,
      })
    } catch (err) {
      console.error(err)
      if (!isAuto) {
        setError('שגיאה בהפקת בקשות התמיכה.')
      }
    } finally {
      setRequestLoading(false)
    }
  }

  const buildOutputRows = (entriesToExport) => {
    const monthDate = parseMonthKeyToDate(monthKey)
    const outputRows = []
    const updatedSupports = supports.map((support) => {
      if (!entriesToExport.find((entry) => entry.id === support.id)) {
        return support
      }
      const status = normalizeStatus(support.status)
      const isActive = activeStatuses.includes(status)
      if (!isActive) return support
      if (support.endDate && monthDate) {
        const endDate = new Date(support.endDate)
        if (!Number.isNaN(endDate.getTime()) && endDate < monthDate) {
          return support
        }
      }

      const supportType = normalizeSupportType(support.supportType) || 'קבועה'
      const nextRawRow = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      const statusIndex = supportsColumnMapping?.statusIndex

      if (supportType === 'חד-פעמית') {
        if (Number.isInteger(statusIndex)) {
          nextRawRow[statusIndex] = 'הפסקה'
        }
        return {
          ...support,
          status: 'הפסקה',
          rawRow: nextRawRow,
          lastGeneratedMonth: monthDate ? monthDate.toISOString() : null,
          exportedMonths: [...(support.exportedMonths || []), monthKey],
        }
      }

      if (supportType === 'קבועה לתקופה') {
        const remaining =
          support.periodRemaining ?? support.periodMonths ?? support.periods ?? 0
        if (remaining <= 1) {
          return {
            ...support,
            exportedMonths: [...(support.exportedMonths || []), monthKey],
            periodRemaining: 0,
            lastGeneratedMonth: monthDate ? monthDate.toISOString() : null,
          }
        }
        return {
          ...support,
          periodRemaining: remaining - 1,
          lastGeneratedMonth: monthDate ? monthDate.toISOString() : null,
          exportedMonths: [...(support.exportedMonths || []), monthKey],
        }
      }
      return {
        ...support,
        lastGeneratedMonth: monthDate ? monthDate.toISOString() : null,
        exportedMonths: [...(support.exportedMonths || []), monthKey],
      }
    })

    entriesToExport.forEach((support) => {
      if (!supportsHeaders || supportsHeaders.length < 15) {
        return
      }
      const row = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      const mapping = supportsColumnMapping || {}
      if (Number.isInteger(mapping.amountIndex)) {
        row[mapping.amountIndex] = support.amount
      }
      if (Number.isInteger(mapping.supportTypeIndex)) {
        row[mapping.supportTypeIndex] = support.supportType
      }
      if (Number.isInteger(mapping.statusIndex)) {
        row[mapping.statusIndex] = support.status
      }
      if (Number.isInteger(mapping.endDateIndex)) {
        row[mapping.endDateIndex] = support.endDate
      }

      const indices = [0, 1, 2, 3, 4, 5, 6, 12, 13, 14]
      const outputRow = indices.reduce((acc, index) => {
        const header = supportsHeaders[index] ?? `עמודה ${index + 1}`
        acc[header] = row[index] ?? ''
        return acc
      }, {})
      outputRows.push(outputRow)

    })

    const validationRows = outputRows.map((row) => {
      const idHeader = supportsHeaders?.[0] || 'מ.ז'
      const nameHeader = supportsHeaders?.[3] || 'שם'
      const generalSupplierHeader = supportsHeaders?.[1] || 'מס\' ספק כולל'
      const maorotSupplierHeader = supportsHeaders?.[2] || 'מס\' ספק מאורות'
      const amountHeader = supportsHeaders?.[5] || 'סכום'
      return {
        idNumber: normalizeString(row[idHeader] || ''),
        generalSupplierNumber: normalizeString(row[generalSupplierHeader] || ''),
        maorotSupplierNumber: normalizeString(row[maorotSupplierHeader] || ''),
        name: normalizeString(row[nameHeader] || ''),
        amount: row[amountHeader] ?? '',
        row,
      }
    })

    return { outputRows, updatedSupports, validationRows }
  }

  const updateExportLog = (type, count) => {
    const nextLog = [
      ...(exportLog || []),
      {
        id: `${Date.now()}-${Math.random()}`,
        month: monthKey,
        type,
        count,
        createdAt: new Date().toISOString(),
      },
    ]
    onExportLogChange?.(nextLog)
  }

  const markExtraSupportsExported = (entriesToExport) => {
    const exportedIds = new Set(entriesToExport.map((entry) => entry.id))
    const remainingExtras = extraSupports.filter((entry) => !exportedIds.has(entry.id))
    const exportedEntries = extraSupports.filter((entry) => exportedIds.has(entry.id))
    if (exportedEntries.length > 0) {
      const exportedWithMonth = exportedEntries.map((entry) => ({
        ...entry,
        exportedMonths: [...(entry.exportedMonths || []), monthKey],
      }))
      onExportedExtraSupportsChange?.([...(exportedExtraSupports || []), ...exportedWithMonth])
    }
    onExtraSupportsChange(remainingExtras)
  }

  const handleGenerate = async () => {
    setError('')
    if (!monthKey) {
      setError('אנא בחר חודש להפקה.')
      return
    }
    const entriesToExport = supportsNotExportedThisMonth
    if (!supportsHeaders || supportsHeaders.length < 15) {
      setError('חסר מבנה עמודות תקין (A-G, M-O) מקובץ מפורט.')
      return
    }
    const { outputRows, updatedSupports, validationRows } = buildOutputRows(entriesToExport)
    if (outputRows.length === 0) {
      setError('אין תמיכות פעילות להפקה לחודש זה.')
      return
    }

    const fileName = `קובץ_תמיכות_${monthKey.replace('/', '-')}.xlsx`
    exportToExcel(outputRows, 'Supports', fileName)

    onSupportsChange(updatedSupports)
    markExtraSupportsExported(entriesToExport)
    onLastGeneratedMonthChange(monthKey)
    updateExportLog('monthly', outputRows.length)

    setLastExportedRows(validationRows)
    setLastExportedMonthKey(monthKey)

    if (autoGenerateSupportRequests) {
      await handleGenerateSupportRequests(true)
    }
  }

  const handleGenerateDifferential = () => {
    setError('')
    if (!monthKey) {
      setError('אנא בחר חודש להפקה.')
      return
    }
    const entriesToExport = supportsNotExportedThisMonth
    if (entriesToExport.length === 0) {
      setError('אין תמיכות חדשות להורדה דיפרנציאלית.')
      return
    }
    if (!supportsHeaders || supportsHeaders.length < 15) {
      setError('חסר מבנה עמודות תקין (A-G, M-O) מקובץ מפורט.')
      return
    }
    const { outputRows, updatedSupports, validationRows } = buildOutputRows(entriesToExport)
    const fileName = `קובץ_תמיכות_דיפרנציאלי_${monthKey.replace('/', '-')}.xlsx`
    exportToExcel(outputRows, 'Supports', fileName)
    onSupportsChange(updatedSupports)
    markExtraSupportsExported(entriesToExport)
    updateExportLog('diff', outputRows.length)

    setLastExportedRows(validationRows)
    setLastExportedMonthKey(monthKey)
  }

  const handleSetValidationBaseline = () => {
    if (!lastExportedRows || lastExportedRows.length === 0) {
      setValidationError('אין קובץ מופק לשיוך לבדיקה.')
      return
    }
    onLastGeneratedValidationChange?.({
      rows: lastExportedRows,
      monthKey: lastExportedMonthKey || monthKey,
    })
    setValidationError('')
  }


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">מחולל תמיכות</h2>
            <p className="text-sm text-gray-500">
              יצירת קובץ חודשי לפי תמיכות פעילות ואיפוס נתונים זמניים.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleTemplateUpload}
              />
              תבנית קובץ לשליחה
            </label>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>סה"כ תמיכות: {supportsSummary.total}</span>
            <span>פעילות: {supportsSummary.active}</span>
            <span>תוספות חודשיות: {supportsSummary.extra}</span>
            <span>חד-פעמיות: {supportsSummary.oneTime}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              placeholder="MM/YYYY"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 w-28"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              הפקת קובץ תמיכות
            </button>
            <button
              type="button"
              onClick={handleGenerateDifferential}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              הורדה דיפרנציאלית
            </button>
          </div>
        </div>
        {lastGeneratedMonth && (
          <p className="mt-3 text-xs text-gray-500">
            הפקה אחרונה לחודש: {lastGeneratedMonth}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSetValidationBaseline}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
          >
            הגדר קובץ זה לבדיקה
          </button>
          {validationError && (
            <span className="text-sm text-red-600">{validationError}</span>
          )}
        </div>
        {lastGeneratedMonthKey && (
          <p className="mt-2 text-xs text-gray-500">
            קובץ לבדיקה חודש: {lastGeneratedMonthKey}
          </p>
        )}
      </div>

      {/* הוספת תמיכות ידנית הועברה ללשונית ניהול תמיכות */}
    </div>
  )
}

export default SupportsGeneratorTab

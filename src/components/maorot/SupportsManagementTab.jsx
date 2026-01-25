import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  normalizeString,
  parseSupportRows,
  readSpreadsheetFile,
  normalizeSupportType,
  normalizeStatus,
  formatDateDisplay,
  formatDateInput,
  findColumnIndex,
  buildSupportEntryFromRow,
} from '../../utils/maorotUtils'

const statusOptions = ['פעיל', 'הפסקה', 'השהיה']
const supportTypeOptions = ['חד-פעמית', 'קבועה', 'קבועה לתקופה']

const SupportsManagementTab = ({
  supports,
  supportsHeaders,
  supportsColumnMapping,
  directoryEntries,
  onSupportsChange,
  onSupportsSave,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [draftSupports, setDraftSupports] = useState(null)
  const [draftHeaders, setDraftHeaders] = useState([])
  const [draftColumnMapping, setDraftColumnMapping] = useState({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('פעיל')
  const [scrollWidth, setScrollWidth] = useState('100%')
  const [showSupportForm, setShowSupportForm] = useState(false)
  const [supportFormValues, setSupportFormValues] = useState({})
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false)
  const topScrollRef = useRef(null)
  const tableScrollRef = useRef(null)
  const tableRef = useRef(null)

  const tableHeaders = draftHeaders.length > 0 ? draftHeaders : supportsHeaders || []
  const tableSupports = draftSupports ?? supports
  const columnMapping = draftHeaders.length > 0 ? draftColumnMapping : supportsColumnMapping || {}
  const effectiveMapping = {
    supportTypeIndex: columnMapping.supportTypeIndex ?? 7,
    monthsIndex: columnMapping.monthsIndex ?? 8,
    statusIndex: columnMapping.statusIndex ?? 10,
    endDateIndex: columnMapping.endDateIndex ?? 8,
  }

  const normalizeId = (value) => normalizeString(value).replace(/\D/g, '')

  const directoryLookup = useMemo(() => {
    return (directoryEntries || []).reduce((acc, entry) => {
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

  const formHeaders = tableHeaders
  const formHeaderKeys = useMemo(() => {
    return formHeaders.map((header, index) => normalizeString(header) || `עמודה ${index + 1}`)
  }, [formHeaders])

  const formLabelOverrides = useMemo(() => {
    const overrides = {}
    if (formHeaderKeys[1]) overrides[formHeaderKeys[1]] = 'מספר ספק כולל'
    if (formHeaderKeys[2]) overrides[formHeaderKeys[2]] = 'מספר ספק מאורות'
    return overrides
  }, [formHeaderKeys])

  const findFormKeyByTerms = useMemo(() => {
    return (terms) => {
      const termMatches = formHeaders.find((header) => {
        const headerStr = normalizeString(header).toLowerCase()
        return terms.some((term) => headerStr.includes(term.toLowerCase()))
      })
      if (!termMatches) return null
      const index = formHeaders.indexOf(termMatches)
      return formHeaderKeys[index] || null
    }
  }, [formHeaders, formHeaderKeys])

  const idFormKey = useMemo(
    () => findFormKeyByTerms(['מ.ז', 'ת.ז', 'זהות', 'id']),
    [findFormKeyByTerms]
  )
  const nameFormKey = useMemo(
    () => findFormKeyByTerms(['שם', 'נתמך', 'מקבל']),
    [findFormKeyByTerms]
  )
  const bankFormKey = useMemo(() => findFormKeyByTerms(["מס' בנק", 'בנק']), [findFormKeyByTerms])
  const branchFormKey = useMemo(
    () => findFormKeyByTerms(["מס' סניף", 'סניף']),
    [findFormKeyByTerms]
  )
  const accountFormKey = useMemo(
    () => findFormKeyByTerms(["מס' חשבון", 'חשבון']),
    [findFormKeyByTerms]
  )
  const maorotSupplierFormKey = useMemo(
    () => findFormKeyByTerms(["מס' ספק מאורות", 'ספק מאורות']),
    [findFormKeyByTerms]
  )
  const generalSupplierFormKey = useMemo(
    () => findFormKeyByTerms(["מס' ספק כולל", 'ספק כולל', 'כולל מאורות']),
    [findFormKeyByTerms]
  )

  const filteredSupports = useMemo(() => {
    const sourceSupports = draftSupports ?? supports
    const baseSupports = showDuplicatesOnly
      ? (() => {
          const counts = sourceSupports.reduce((acc, support) => {
            const key = normalizeId(support.idNumber)
            if (!key) return acc
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {})
          return sourceSupports.filter((support) => {
            const key = normalizeId(support.idNumber)
            return key && counts[key] > 1
          })
        })()
      : sourceSupports
    if (!searchTerm) return baseSupports
    const query = normalizeString(searchTerm).toLowerCase()
    return baseSupports.filter((support) => {
      const directoryEntry = directoryLookup[support.idNumber] || {}
      const rowValues = Array.isArray(support.rawRow) ? support.rawRow : []
      const values = [
        support.idNumber,
        support.name,
        support.amount,
        support.supportType,
        support.status,
        ...rowValues,
        directoryEntry.name,
        directoryEntry.maorotSupplierNumber,
        directoryEntry.generalSupplierNumber,
        directoryEntry.bankNumber,
        directoryEntry.branchNumber,
        directoryEntry.accountNumber,
      ]
      return values
        .map((value) => normalizeString(value).toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [supports, draftSupports, searchTerm, directoryLookup, showDuplicatesOnly])

  const directoryColumnMapping = useMemo(() => {
    if (!tableHeaders || tableHeaders.length === 0) {
      return {}
    }
    return {
      idIndex: findColumnIndex(tableHeaders, ['מ.ז', 'תעודת', 'זהות', 'id'], 0),
      nameIndex: findColumnIndex(tableHeaders, ['שם', 'נתמך', 'מקבל'], null),
      bankIndex: findColumnIndex(tableHeaders, ["מס' בנק", 'בנק'], null),
      branchIndex: findColumnIndex(tableHeaders, ["מס' סניף", 'סניף'], null),
      accountIndex: findColumnIndex(tableHeaders, ["מס' חשבון", 'חשבון'], null),
      maorotSupplierIndex: findColumnIndex(tableHeaders, ["מס' ספק מאורות", 'ספק מאורות'], null),
      generalSupplierIndex: findColumnIndex(tableHeaders, ["מס' ספק כולל", 'ספק כולל', 'כולל מאורות'], null),
      categoryIndex: findColumnIndex(tableHeaders, ['קטגוריה', 'category'], null),
      frameIndex: findColumnIndex(tableHeaders, ['מסגרת', 'frame'], null),
      amountIndex: findColumnIndex(tableHeaders, ['סכום', 'amount', 'סך'], null),
      notesIndex: findColumnIndex(tableHeaders, ['הערות', 'notes', 'remark'], null),
    }
  }, [tableHeaders])

  useEffect(() => {
    const topEl = topScrollRef.current
    const tableEl = tableScrollRef.current
    const tableContent = tableRef.current
    if (!topEl || !tableEl || !tableContent) return

    const updateWidth = () => {
      setScrollWidth(`${tableContent.scrollWidth}px`)
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(tableContent)

    const syncTop = () => {
      topEl.scrollLeft = tableEl.scrollLeft
    }
    const syncTable = () => {
      tableEl.scrollLeft = topEl.scrollLeft
    }

    tableEl.addEventListener('scroll', syncTop)
    topEl.addEventListener('scroll', syncTable)

    return () => {
      resizeObserver.disconnect()
      tableEl.removeEventListener('scroll', syncTop)
      topEl.removeEventListener('scroll', syncTable)
    }
  }, [tableHeaders, filteredSupports.length])

  const getRowValue = (support, index) => {
    const rawValue =
      support.rawRow && support.rawRow.length > index ? support.rawRow[index] : ''
    const header = tableHeaders[index]
    const normalizedHeader = normalizeString(header)
    if (!header || !support.rawData) return rawValue
    const value = support.rawData[normalizedHeader] ?? rawValue
    const normalizedValue = normalizeString(value)
    const isEmptyPlaceholder = normalizedValue === '-' || normalizedValue === '—'

    if (normalizedValue && !isEmptyPlaceholder) return value

    const directoryEntry = getDirectoryEntry(support.idNumber)
    if (!directoryEntry) return value

    if (index === 1 && directoryEntry.generalSupplierNumber) {
      return directoryEntry.generalSupplierNumber
    }
    if (index === 2 && directoryEntry.maorotSupplierNumber) {
      return directoryEntry.maorotSupplierNumber
    }
    if (index === directoryColumnMapping.nameIndex) return directoryEntry.name || value
    if (index === directoryColumnMapping.bankIndex) return directoryEntry.bankNumber || value
    if (index === directoryColumnMapping.branchIndex) return directoryEntry.branchNumber || value
    if (index === directoryColumnMapping.accountIndex) return directoryEntry.accountNumber || value
    if (index === directoryColumnMapping.maorotSupplierIndex) {
      return directoryEntry.maorotSupplierNumber || value
    }
    if (index === directoryColumnMapping.generalSupplierIndex) {
      return directoryEntry.generalSupplierNumber || value
    }

    return value
  }

  const statusColumnIndex = Number.isInteger(effectiveMapping.statusIndex)
    ? effectiveMapping.statusIndex
    : null

  const displayHeaders = useMemo(() => {
    if (!tableHeaders || tableHeaders.length === 0) return []
    const filtered =
      statusColumnIndex === null
        ? tableHeaders
        : tableHeaders.filter((_, idx) => idx !== statusColumnIndex)
    return [...filtered, 'סטטוס']
  }, [tableHeaders, statusColumnIndex])

  const handleImport = async (event, mode = 'replace') => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const { rawData } = await readSpreadsheetFile(file)
      const { entries, headers, columnMapping: mapping } = parseSupportRows(rawData)
      if (mode === 'append') {
        const existingHeaders = tableHeaders || []
        if (existingHeaders.length > 0) {
          const normalizedExisting = existingHeaders.map((header) =>
            normalizeString(header).toLowerCase()
          )
          const normalizedIncoming = headers.map((header) =>
            normalizeString(header).toLowerCase()
          )
          const headersMatch =
            normalizedExisting.length === normalizedIncoming.length &&
            normalizedExisting.every((value, index) => value === normalizedIncoming[index])
          if (!headersMatch) {
            setError('כותרות הקובץ אינן תואמות לקובץ הקיים. הטעינה בוטלה.')
            setLoading(false)
            event.target.value = ''
            return
          }
        }
        const sourceSupports = draftSupports ?? supports
        const nextSupports = [...sourceSupports, ...entries]
        if (draftSupports) {
          setDraftSupports(nextSupports)
        } else {
          onSupportsChange(nextSupports)
        }
        if ((!supportsHeaders || supportsHeaders.length === 0) && !draftSupports) {
          onSupportsSave?.({
            entries: nextSupports,
            headers,
            columnMapping: mapping || {},
          })
        }
      } else {
        setDraftSupports(entries)
        setDraftHeaders(headers)
        setDraftColumnMapping(mapping || {})
        setSaveSuccess(false)
      }
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ. ודא שזה Excel תקין.')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const updateSupport = (id, updates) => {
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.map((support) =>
      support.id === id ? { ...support, ...updates } : support
    )
    if (draftSupports) {
      setDraftSupports(nextSupports)
    } else {
      onSupportsChange(nextSupports)
    }
  }

  const updateSupportCell = (id, colIndex, value, updates = {}) => {
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.map((support) => {
      if (support.id !== id) return support
      const nextRawRow = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      nextRawRow[colIndex] = value
      return {
        ...support,
        ...updates,
        rawRow: nextRawRow,
      }
    })
    if (draftSupports) {
      setDraftSupports(nextSupports)
    } else {
      onSupportsChange(nextSupports)
    }
  }

  const handleToggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedRows.length === filteredSupports.length) {
      setSelectedRows([])
      return
    }
    setSelectedRows(filteredSupports.map((support) => support.id))
  }

  const handleBulkStatusUpdate = () => {
    if (selectedRows.length === 0) {
      setError('בחר לפחות שורה אחת לעדכון סטטוס.')
      return
    }
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.map((support) => {
      if (!selectedRows.includes(support.id)) return support
      const nextRawRow = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      if (Number.isInteger(effectiveMapping.statusIndex)) {
        nextRawRow[effectiveMapping.statusIndex] = selectedStatus
      }
      return {
        ...support,
        status: normalizeStatus(selectedStatus),
        rawRow: nextRawRow,
      }
    })
    if (draftSupports) {
      setDraftSupports(nextSupports)
    } else {
      onSupportsChange(nextSupports)
    }
    setSelectedRows([])
  }

  const handleSave = () => {
    if (!draftSupports) return
    onSupportsSave?.({
      entries: draftSupports,
      headers: draftHeaders,
      columnMapping: draftColumnMapping,
    })
    setSaveSuccess(true)
    setDraftSupports(null)
    setDraftHeaders([])
    setDraftColumnMapping({})
  }

  const handleToggleSupportForm = () => {
    if (!formHeaders || formHeaders.length === 0) {
      setError('יש לטעון קובץ מפורט לפני הוספת תמיכה ידנית.')
      return
    }
    setShowSupportForm((prev) => !prev)
    if (!showSupportForm) {
      const initialValues = formHeaderKeys.reduce((acc, key) => {
        acc[key] = ''
        return acc
      }, {})
      setSupportFormValues(initialValues)
    }
  }

  const handleSupportFormChange = (key, value) => {
    setSupportFormValues((prev) => {
      const next = { ...prev, [key]: value }
      if (key === idFormKey) {
        const directoryEntry = getDirectoryEntry(value)
        if (directoryEntry) {
          if (nameFormKey) next[nameFormKey] = directoryEntry.name || next[nameFormKey]
          if (bankFormKey) next[bankFormKey] = directoryEntry.bankNumber || next[bankFormKey]
          if (branchFormKey) next[branchFormKey] = directoryEntry.branchNumber || next[branchFormKey]
          if (accountFormKey) next[accountFormKey] = directoryEntry.accountNumber || next[accountFormKey]
          if (maorotSupplierFormKey) {
            next[maorotSupplierFormKey] =
              directoryEntry.maorotSupplierNumber || next[maorotSupplierFormKey]
          }
          if (generalSupplierFormKey) {
            next[generalSupplierFormKey] =
              directoryEntry.generalSupplierNumber || next[generalSupplierFormKey]
          }
          if (formHeaderKeys[1]) {
            next[formHeaderKeys[1]] =
              directoryEntry.generalSupplierNumber || next[formHeaderKeys[1]]
          }
          if (formHeaderKeys[2]) {
            next[formHeaderKeys[2]] =
              directoryEntry.maorotSupplierNumber || next[formHeaderKeys[2]]
          }
        }
      }
      return next
    })
  }

  const handleSupportFormSubmit = () => {
    if (!formHeaders || formHeaders.length === 0) {
      setError('יש לטעון קובץ מפורט לפני הוספת תמיכה ידנית.')
      return
    }
    const row = formHeaders.map((_, index) => supportFormValues[formHeaderKeys[index]] || '')
    const entry = buildSupportEntryFromRow(formHeaders, row, columnMapping)
    const entryWithDefaults = {
      ...entry,
      status: normalizeStatus(entry.status) || 'פעיל',
    }

    const sourceSupports = draftSupports ?? supports
    const nextSupports = [...sourceSupports, entryWithDefaults]
    if (draftSupports) {
      setDraftSupports(nextSupports)
    } else {
      onSupportsChange(nextSupports)
    }

    setShowSupportForm(false)
    setSupportFormValues({})
  }

  const handleClear = () => {
    setDraftSupports(null)
    setDraftHeaders([])
    setDraftColumnMapping({})
    onSupportsChange([])
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">ניהול תמיכות</h2>
            <p className="text-sm text-gray-500">
              טען את קובץ "קובץ מפורט" ועדכן שורות ישירות בממשק.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors text-sm">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => handleImport(event, 'replace')}
              />
              {loading ? 'טוען...' : 'טעינת קובץ מפורט'}
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg cursor-pointer hover:bg-primary-200 transition-colors text-sm">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => handleImport(event, 'append')}
              />
              טעינת קובץ נוסף
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              ניקוי נתונים
            </button>
            {draftSupports && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                שמור נתונים
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            הנתונים נשמרו בהצלחה ונכנסו לבסיס הנתונים.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">טבלת תמיכות</h3>
          <input
            type="text"
            placeholder="חיפוש לפי מ.ז, שם, סכום או סוג תמיכה"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 w-full md:w-72"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkStatusUpdate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            עדכן סטטוס לשורות הנבחרות
          </button>
          <button
            type="button"
            onClick={() => setShowDuplicatesOnly((prev) => !prev)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            {showDuplicatesOnly ? 'הצג את כל השורות' : 'בדיקת כפילויות'}
          </button>
          <button
            type="button"
            onClick={handleToggleSupportForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            {showSupportForm ? 'סגור טופס תמיכה' : 'הוספת תמיכה ידנית'}
          </button>
        </div>
        {showSupportForm && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {formHeaders.map((header, index) => {
                const key = formHeaderKeys[index]
                return (
                  <div key={`${key}-${index}`} className="flex flex-col gap-1 text-sm">
                    <label className="text-gray-600">{formLabelOverrides[key] || key}</label>
                    <input
                      type="text"
                      value={supportFormValues[key] || ''}
                      onChange={(event) => handleSupportFormChange(key, event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSupportFormSubmit}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
              >
                הוסף תמיכה
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg cursor-pointer hover:bg-primary-200 transition-colors text-sm">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => handleImport(event, 'append')}
                />
                טעינת קובץ נוסף (מצטרף)
              </label>
            </div>
          </div>
        )}
        <div
          ref={topScrollRef}
          className="top-scrollbar mt-4 h-6 overflow-x-scroll overflow-y-hidden rounded-lg border border-gray-200"
          style={{ scrollbarGutter: 'stable both-edges' }}
          dir="ltr"
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
        <div
          className="mt-4 max-h-[60vh] overflow-x-auto overflow-y-auto"
          ref={tableScrollRef}
          dir="ltr"
        >
          <table
            ref={tableRef}
            className="min-w-[1200px] text-sm border border-gray-200 rounded-lg"
            dir="rtl"
          >
            <thead className="bg-white text-gray-600 shadow-sm">
              <tr>
                <th className="px-3 py-2 text-right">
                  <input
                    type="checkbox"
                    checked={
                      filteredSupports.length > 0 &&
                      selectedRows.length === filteredSupports.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                {displayHeaders.length > 0 ? (
                  displayHeaders.map((header, index) => (
                    <th
                      key={`${header}-${index}`}
                      className="px-3 py-2 text-right sticky top-0 z-20 bg-white"
                    >
                      {normalizeString(header) || `עמודה ${index + 1}`}
                    </th>
                  ))
                ) : (
                  <th className="px-3 py-2 text-right sticky top-0 z-20 bg-white">
                    אין כותרות להצגה
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredSupports.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(displayHeaders.length + 1, 1)}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    אין נתונים להצגה.
                  </td>
                </tr>
              ) : (
                filteredSupports.map((support) => (
                  <tr key={support.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(support.id)}
                        onChange={() => handleToggleRow(support.id)}
                      />
                    </td>
                    {displayHeaders.map((header, displayIndex) => {
                      const isStatusColumn = displayIndex === displayHeaders.length - 1
                      const colIndex = isStatusColumn
                        ? statusColumnIndex
                        : statusColumnIndex === null
                          ? displayIndex
                          : displayIndex >= statusColumnIndex
                            ? displayIndex + 1
                            : displayIndex
                      if (isStatusColumn) {
                        return (
                          <td key="status-column" className="px-3 py-2">
                            {normalizeStatus(support.status) || 'פעיל'}
                          </td>
                        )
                      }
                      const rawValue = getRowValue(support, colIndex)
                      if (colIndex === effectiveMapping.supportTypeIndex) {
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            <select
                              value={normalizeSupportType(support.supportType) || 'קבועה'}
                              onChange={(event) =>
                                updateSupportCell(
                                  support.id,
                                  colIndex,
                                  event.target.value,
                                  {
                                    supportType: normalizeSupportType(event.target.value),
                                  }
                                )
                              }
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                            >
                              {supportTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                        )
                      }

                      if (colIndex === effectiveMapping.monthsIndex) {
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={support.periodMonths ?? ''}
                              onChange={(event) => {
                                const value = event.target.value ? Number(event.target.value) : null
                                updateSupportCell(support.id, colIndex, event.target.value, {
                                  periodMonths: value,
                                  periodRemaining: value,
                                })
                              }}
                              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs"
                              placeholder="—"
                            />
                          </td>
                        )
                      }

                      if (colIndex === effectiveMapping.endDateIndex) {
                        const inputValue = formatDateInput(
                          support.endDate || getRowValue(support, colIndex)
                        )
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            <input
                              type="date"
                              value={inputValue}
                              onChange={(event) =>
                                updateSupportCell(
                                  support.id,
                                  colIndex,
                                  event.target.value,
                                  { endDate: event.target.value }
                                )
                              }
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                            />
                          </td>
                        )
                      }

                      if (colIndex === 8) {
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            {formatDateDisplay(rawValue) || '-'}
                          </td>
                        )
                      }

                      if (colIndex === directoryColumnMapping.amountIndex) {
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            <input
                              type="number"
                              value={normalizeString(rawValue)}
                              onChange={(event) =>
                                updateSupportCell(
                                  support.id,
                                  colIndex,
                                  event.target.value,
                                  { amount: event.target.value }
                                )
                              }
                              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs"
                            />
                          </td>
                        )
                      }

                      if (
                        colIndex === directoryColumnMapping.categoryIndex ||
                        colIndex === directoryColumnMapping.frameIndex
                      ) {
                        return (
                          <td key={colIndex} className="px-3 py-2">
                            <input
                              type="text"
                              value={normalizeString(rawValue)}
                              onChange={(event) =>
                                updateSupportCell(support.id, colIndex, event.target.value)
                              }
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                            />
                          </td>
                        )
                      }

                      return (
                        <td key={colIndex} className="px-3 py-2">
                          {normalizeString(rawValue) || '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

export default SupportsManagementTab

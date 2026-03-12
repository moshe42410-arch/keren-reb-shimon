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
  normalizeIdentifier,
} from '../../utils/maorotUtils'
import { useAuth } from '../../context/AuthContext'

const statusOptions = ['פעיל', 'הפסקה', 'השהיה']
const supportTypeOptions = ['חד-פעמית', 'קבועה', 'קבועה לתקופה']

const SupportsManagementTab = ({
  supports,
  supportsHeaders,
  supportsColumnMapping,
  directoryEntries,
  categories = [],
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
  const [showNoCategoryFilter, setShowNoCategoryFilter] = useState(false)
  const [showNoFrameFilter, setShowNoFrameFilter] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState(null)
  const [tempValues, setTempValues] = useState({}) // ערכים זמניים לפני אישור
  const [activeInputId, setActiveInputId] = useState(null) // מזהה השדה הפעיל להצגת הצעות
  const { currentUser } = useAuth()
  const isAdmin = currentUser && currentUser.role === 'admin'
  const topScrollRef = useRef(null)
  const tableScrollRef = useRef(null)
  const tableRef = useRef(null)

  // כותרות קבועות לפי הפורמט הסטנדרטי של קובץ מפורט
  const defaultHeaders = [
    'מ.ז',
    "מס' ספק כולל",
    "מס' ספק מאורות",
    'שם',
    "מס' בנק",
    "מס' סניף",
    "מס' חשבון",
    'סוג תמיכה',
    'מספר חודשים',
    'מועד סיום',
    'סטטוס',
    'קטגוריה',
    'מסגרת',
    'סכום',
    'הערות',
  ]

  const tableHeaders = draftHeaders.length > 0 
    ? draftHeaders 
    : supportsHeaders && supportsHeaders.length > 0 
      ? supportsHeaders 
      : defaultHeaders
  const tableSupports = draftSupports ?? supports
  const columnMapping = draftHeaders.length > 0 ? draftColumnMapping : supportsColumnMapping || {}
  const effectiveMapping = {
    supportTypeIndex: columnMapping.supportTypeIndex ?? 7,
    monthsIndex: columnMapping.monthsIndex ?? 8,
    statusIndex: columnMapping.statusIndex ?? 10,
    endDateIndex: columnMapping.endDateIndex ?? 8,
  }

  const normalizeId = normalizeIdentifier

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
    
    // מחפש התאמה מדויקת באלפון
    return directoryLookup[rawId] || directoryLookup[digitId] || null
  }

  const formHeaders = tableHeaders.length > 0 ? tableHeaders : defaultHeaders
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

  // רשימת קטגוריות ומסגרות זמינות
  const availableCategories = useMemo(() => {
    return [...new Set(categories.map((c) => c.category).filter(Boolean))].sort()
  }, [categories])

  const availableFrames = useMemo(() => {
    return [...new Set(categories.map((c) => c.frame).filter(Boolean))].sort()
  }, [categories])

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

  const filteredSupports = useMemo(() => {
    const sourceSupports = draftSupports ?? supports
    let baseSupports = showDuplicatesOnly
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

    // סינון תמיכות ללא קטגוריה
    if (showNoCategoryFilter) {
      baseSupports = baseSupports.filter((support) => {
        const categoryValue = getRowValue(support, directoryColumnMapping.categoryIndex)
        return !categoryValue || normalizeString(categoryValue) === '' || normalizeString(categoryValue) === '-'
      })
    }

    // סינון תמיכות ללא מסגרת
    if (showNoFrameFilter) {
      baseSupports = baseSupports.filter((support) => {
        const frameValue = getRowValue(support, directoryColumnMapping.frameIndex)
        return !frameValue || normalizeString(frameValue) === '' || normalizeString(frameValue) === '-'
      })
    }

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
  }, [supports, draftSupports, searchTerm, directoryLookup, showDuplicatesOnly, showNoCategoryFilter, showNoFrameFilter, directoryColumnMapping, tableHeaders, normalizeId])

  useEffect(() => {
    const topEl = topScrollRef.current
    const tableEl = tableScrollRef.current
    const tableContent = tableRef.current
    if (!topEl || !tableEl || !tableContent) return

    const updateWidth = () => {
      // מגביל את הרוחב המקסימלי ל-2500px
      const width = Math.min(tableContent.scrollWidth, 2500)
      setScrollWidth(`${width}px`)
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

  const statusColumnIndex = Number.isInteger(effectiveMapping.statusIndex)
    ? effectiveMapping.statusIndex
    : null

  const displayHeaders = useMemo(() => {
    const headersToUse = tableHeaders && tableHeaders.length > 0 ? tableHeaders : defaultHeaders
    if (!headersToUse || headersToUse.length === 0) return []
    const filtered =
      statusColumnIndex === null
        ? headersToUse
        : headersToUse.filter((_, idx) => idx !== statusColumnIndex)
    return [...filtered, 'סטטוס']
  }, [tableHeaders, statusColumnIndex])

  const handleImport = async (event, mode = 'replace') => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const { rawData } = await readSpreadsheetFile(file)
      if (!rawData || rawData.length === 0) {
        setError('הקובץ ריק או לא ניתן לקרוא אותו.')
        setLoading(false)
        event.target.value = ''
        return
      }
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

  // שמירת ערך זמני (ללא אישור)
  const setTempValue = (id, colIndex, value) => {
    const key = `${id}-${colIndex}`
    setTempValues((prev) => ({ ...prev, [key]: value }))
  }

  // קבלת ערך זמני או ערך נוכחי
  const getTempValue = (id, colIndex, currentValue) => {
    const key = `${id}-${colIndex}`
    return tempValues[key] !== undefined ? tempValues[key] : currentValue
  }

  // פתיחת חלון אישור כשעוזבים את השדה
  const handleCellBlur = (id, colIndex, value, updates = {}) => {
    const sourceSupports = draftSupports ?? supports
    const support = sourceSupports.find((s) => s.id === id)
    if (!support) return

    const key = `${id}-${colIndex}`
    const tempValue = tempValues[key]
    
    // אם יש שינוי, פותח חלון אישור
    if (tempValue !== undefined && tempValue !== value) {
      setPendingUpdate({ id, colIndex, value: tempValue, updates, support })
      setConfirmDialogOpen(true)
    } else {
      // אם אין שינוי, מנקה את הערך הזמני
      setTempValues((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const updateSupportCell = (id, colIndex, value, updates = {}) => {
    const sourceSupports = draftSupports ?? supports
    const support = sourceSupports.find((s) => s.id === id)
    if (!support) return

    // שמירת העדכון הממתין לאישור
    setPendingUpdate({ id, colIndex, value, updates, support })
    setConfirmDialogOpen(true)
  }

  const handleConfirmUpdate = () => {
    if (!pendingUpdate) return

    const { id, colIndex, value, updates } = pendingUpdate
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.map((support) => {
      if (support.id !== id) return support
      const nextRawRow = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      nextRawRow[colIndex] = value
      
      // עדכון גם ב-rawData לפי הכותרת
      const header = tableHeaders[colIndex]
      const normalizedHeader = normalizeString(header)
      const nextRawData = { ...support.rawData }
      if (normalizedHeader) {
        nextRawData[normalizedHeader] = value
      }
      
      return {
        ...support,
        ...updates,
        rawRow: nextRawRow,
        rawData: nextRawData,
      }
    })
    
    // תמיד שומר דרך onSupportsChange כדי לשמור ל-storage
    onSupportsChange(nextSupports)
    
    // אם יש draft, מעדכן גם אותו
    if (draftSupports) {
      setDraftSupports(nextSupports)
    }

    // מנקה את הערך הזמני
    const key = `${id}-${colIndex}`
    setTempValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })

    setConfirmDialogOpen(false)
    setPendingUpdate(null)
  }

  const handleCancelUpdate = () => {
    if (pendingUpdate) {
      // מחזיר את הערך המקורי ומנקה את הערך הזמני
      const { id, colIndex } = pendingUpdate
      const key = `${id}-${colIndex}`
      setTempValues((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    setConfirmDialogOpen(false)
    setPendingUpdate(null)
  }

  const handleApproveSupport = (supportId) => {
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.map((support) => {
      if (support.id !== supportId) return support
      const nextRawRow = Array.isArray(support.rawRow) ? [...support.rawRow] : []
      // מסיר את הקטגוריה "ממתין לאישור" ומשאיר את הקטגוריה המקורית או ריק
      if (directoryColumnMapping.categoryIndex !== null) {
        const currentCategory = getRowValue(support, directoryColumnMapping.categoryIndex)
        if (normalizeString(currentCategory) === 'ממתין לאישור') {
          nextRawRow[directoryColumnMapping.categoryIndex] = ''
        }
      }
      return {
        ...support,
        pendingApproval: false,
        rawRow: nextRawRow,
      }
    })
    if (draftSupports) {
      setDraftSupports(nextSupports)
    } else {
      onSupportsChange(nextSupports)
    }
  }

  const handleRejectSupport = (supportId) => {
    const sourceSupports = draftSupports ?? supports
    const nextSupports = sourceSupports.filter((support) => support.id !== supportId)
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
      // אם משנים את המזהה - מאפס את כל השדות האחרים ואז מחפש באלפון
      if (key === idFormKey) {
        // מאפס את כל השדות חוץ מהמזהה
        const resetData = formHeaderKeys.reduce((acc, k) => {
          acc[k] = k === key ? value : ''
          return acc
        }, {})
        
        // מחפש באלפון
        const directoryEntry = getDirectoryEntry(value)
        if (directoryEntry) {
          if (nameFormKey) resetData[nameFormKey] = directoryEntry.name || ''
          if (bankFormKey) resetData[bankFormKey] = directoryEntry.bankNumber || ''
          if (branchFormKey) resetData[branchFormKey] = directoryEntry.branchNumber || ''
          if (accountFormKey) resetData[accountFormKey] = directoryEntry.accountNumber || ''
          if (maorotSupplierFormKey) {
            resetData[maorotSupplierFormKey] = directoryEntry.maorotSupplierNumber || ''
          }
          if (generalSupplierFormKey) {
            resetData[generalSupplierFormKey] = directoryEntry.generalSupplierNumber || ''
          }
          if (formHeaderKeys[1]) {
            resetData[formHeaderKeys[1]] = directoryEntry.generalSupplierNumber || ''
          }
          if (formHeaderKeys[2]) {
            resetData[formHeaderKeys[2]] = directoryEntry.maorotSupplierNumber || ''
          }
        }
        return resetData
      }
      
      // שדה רגיל - רק מעדכן אותו
      return { ...prev, [key]: value }
    })
  }

  const handleSupportFormSubmit = () => {
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

    // אם אין כותרות שמורות, שומרים את הכותרות הקבועות
    if (!supportsHeaders || supportsHeaders.length === 0) {
      onSupportsSave?.({
        entries: nextSupports,
        headers: formHeaders,
        columnMapping: columnMapping,
      })
    }

    setShowSupportForm(false)
    // מאפס את הטופס עם ערכים ריקים
    const resetValues = formHeaderKeys.reduce((acc, key) => {
      acc[key] = ''
      return acc
    }, {})
    setSupportFormValues(resetValues)
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
            onClick={() => setShowNoCategoryFilter((prev) => !prev)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              showNoCategoryFilter
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showNoCategoryFilter ? 'הצג את כל התמיכות' : 'תמיכות ללא קטגוריה'}
          </button>
          <button
            type="button"
            onClick={() => setShowNoFrameFilter((prev) => !prev)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              showNoFrameFilter
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showNoFrameFilter ? 'הצג את כל התמיכות' : 'תמיכות ללא מסגרת'}
          </button>
          <button
            type="button"
            onClick={handleToggleSupportForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            {showSupportForm ? 'סגור טופס תמיכה' : 'הוספת תמיכה ידנית'}
          </button>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/support-form`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            קישור לטופס חיצוני
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
          className="top-scrollbar mt-4 h-3 overflow-x-auto overflow-y-hidden rounded border border-gray-100"
          style={{ scrollbarGutter: 'stable both-edges' }}
          dir="rtl"
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
        <div
          className="mt-2 overflow-x-auto rounded-lg border border-gray-200"
          ref={tableScrollRef}
          dir="rtl"
          style={{ maxWidth: '100%' }}
        >
          <table
            ref={tableRef}
            className="text-sm border-collapse"
            style={{ tableLayout: 'fixed', width: '1500px' }}
            dir="rtl"
          >
            <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2.5 text-right w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredSupports.length > 0 &&
                      selectedRows.length === filteredSupports.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                {displayHeaders.length > 0 ? (
                  <>
                    {displayHeaders.map((header, index) => {
                      // רוחב דינמי לפי סוג העמודה
                      const headerNorm = normalizeString(header).toLowerCase()
                      let width = '80px'
                      if (headerNorm.includes('שם') || headerNorm.includes('הערות')) width = '120px'
                      else if (headerNorm.includes('קטגוריה') || headerNorm.includes('מסגרת')) width = '100px'
                      else if (headerNorm.includes('סכום')) width = '90px'
                      else if (headerNorm.includes('סטטוס')) width = '70px'
                      
                      return (
                      <th
                        key={`${header}-${index}`}
                          className="px-2 py-2.5 text-right font-semibold text-xs truncate"
                          style={{ width }}
                      >
                        {normalizeString(header) || `עמודה ${index + 1}`}
                      </th>
                      )
                    })}
                    {isAdmin && (
                      <th className="px-3 py-2.5 text-right font-semibold text-xs" style={{ width: '100px' }}>
                        פעולות
                      </th>
                    )}
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5 text-right text-xs">
                      אין כותרות להצגה
                    </th>
                    {isAdmin && (
                      <th className="px-3 py-2.5 text-right font-semibold text-xs" style={{ width: '100px' }}>
                        פעולות
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredSupports.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(displayHeaders.length + 1 + (isAdmin ? 1 : 0), 1)}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    אין נתונים להצגה.
                  </td>
                </tr>
              ) : (
                filteredSupports.map((support) => (
                  <tr key={support.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(support.id)}
                        onChange={() => handleToggleRow(support.id)}
                        className="w-4 h-4 rounded"
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
                        const status = normalizeStatus(support.status) || 'פעיל'
                        const statusColor = status === 'פעיל' ? 'bg-green-100 text-green-800' : 
                                           status === 'הפסקה' ? 'bg-red-100 text-red-800' : 
                                           'bg-yellow-100 text-yellow-800'
                        return (
                          <td key="status-column" className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                        )
                      }
                      const rawValue = getRowValue(support, colIndex)
                      if (colIndex === effectiveMapping.supportTypeIndex) {
                        return (
                          <td key={colIndex} className="px-3 py-2 border-l border-gray-100">
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
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
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
                          <td key={colIndex} className="px-3 py-2 border-l border-gray-100">
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
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
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
                          <td key={colIndex} className="px-3 py-2 border-l border-gray-100">
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
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
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
                        const currentValue = normalizeString(rawValue)
                        const displayValue = getTempValue(support.id, colIndex, currentValue)
                        return (
                          <td key={colIndex} className="px-3 py-2 border-l border-gray-100">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={displayValue}
                              onChange={(event) => {
                                const value = event.target.value.replace(/[^\d.]/g, '')
                                setTempValue(support.id, colIndex, value)
                              }}
                              onBlur={() => {
                                const tempValue = tempValues[`${support.id}-${colIndex}`]
                                if (tempValue !== undefined && tempValue !== currentValue) {
                                  handleCellBlur(support.id, colIndex, tempValue, { amount: tempValue })
                                }
                              }}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                              placeholder="סכום"
                            />
                          </td>
                        )
                      }

                      if (
                        colIndex === directoryColumnMapping.categoryIndex ||
                        colIndex === directoryColumnMapping.frameIndex
                      ) {
                        const currentValue = normalizeString(rawValue)
                        const displayValue = getTempValue(support.id, colIndex, currentValue)
                        const isCategory = colIndex === directoryColumnMapping.categoryIndex
                        const isFrame = colIndex === directoryColumnMapping.frameIndex
                        
                        // חיפוש הצעות לפי הקלדה
                        const availableOptions = isCategory ? availableCategories : isFrame ? availableFrames : []
                        const suggestions = displayValue
                          ? availableOptions.filter((opt) =>
                              normalizeString(opt).toLowerCase().includes(displayValue.toLowerCase())
                            )
                          : availableOptions
                        
                        const inputId = `${support.id}-${colIndex}`
                        const showSuggestions = activeInputId === inputId && suggestions.length > 0
                        
                        return (
                          <td key={colIndex} className="px-3 py-2 border-l border-gray-100 relative">
                            <input
                              type="text"
                              value={displayValue}
                              onChange={(event) => {
                                setTempValue(support.id, colIndex, event.target.value)
                                setActiveInputId(inputId)
                              }}
                              onFocus={() => setActiveInputId(inputId)}
                              onBlur={() => {
                                setTimeout(() => {
                                  const key = `${support.id}-${colIndex}`
                                  const tempValue = tempValues[key]
                                  // רק אם יש שינוי ואין חלון אישור פתוח - פותח חלון אישור
                                  if (tempValue !== undefined && tempValue !== currentValue && !confirmDialogOpen) {
                                    handleCellBlur(support.id, colIndex, tempValue)
                                  }
                                  setActiveInputId(null)
                                }, 300)
                              }}
                              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-full focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                            />
                            {showSuggestions && (
                              <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-32 overflow-y-auto w-full">
                                {suggestions.slice(0, 8).map((suggestion, idx) => (
                                  <div
                                    key={idx}
                                    className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-xs border-b border-gray-100 last:border-b-0"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      // בוחר את הערך וסוגר את הרשימה
                                      setTempValue(support.id, colIndex, suggestion)
                                      setActiveInputId(null)
                                      // מפעיל את חלון האישור אחרי עיכוב קצר
                                      setTimeout(() => {
                                        handleCellBlur(support.id, colIndex, suggestion)
                                      }, 100)
                                    }}
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      }

                      return (
                        <td key={colIndex} className="px-3 py-2 border-l border-gray-100 truncate" title={normalizeString(rawValue) || '-'}>
                          {normalizeString(rawValue) || '-'}
                        </td>
                      )
                    })}
                    {isAdmin && (
                      <td key="actions" className="px-3 py-2">
                        {support.pendingApproval && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveSupport(support.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                              title="אשר תמיכה"
                            >
                              ✓ אישור
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectSupport(support.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                              title="דחה תמיכה"
                            >
                              ✗ דחייה
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            </table>
        </div>
      </div>

      {/* דיאלוג אישור שינוי - עיצוב נקי ואסתטי */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full mx-4 pointer-events-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">שמירת שינויים</h3>
            </div>
            <p className="text-gray-600 mb-5 text-sm">
              האם לשמור את השינוי?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelUpdate}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportsManagementTab

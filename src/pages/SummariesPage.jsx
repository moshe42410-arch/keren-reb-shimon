import React, { useState, useEffect, useMemo, useRef } from 'react'
import { getAllFundsWithLabels, getDataByDateRange } from '../services/storageService'
import { fetchAllCategoriesData } from '../services/googleSheets'
import { extractMonthFromDate } from '../services/syncService'
import { useData } from '../context/DataContext'
import { loadMaorotData } from '../services/maorotStorage'
import ConflictResolutionModal from '../components/ConflictResolutionModal'
import {
  buildSupportIdentifiers,
  findColumnIndex,
  formatDateDisplay,
  normalizeIdentifier,
  normalizeString,
} from '../utils/maorotUtils'
import { getRowGrossAmount, getRowOverheadAmount, parseFinancialNumber } from '../utils/movementAmounts'
import * as XLSX from 'xlsx'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Menu from '@mui/material/Menu'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import html2canvas from 'html2canvas'
import DownloadIcon from '@mui/icons-material/Download'
import TableChartIcon from '@mui/icons-material/TableChart'
import SummarizeIcon from '@mui/icons-material/Summarize'
import FilterListIcon from '@mui/icons-material/FilterList'
import DescriptionIcon from '@mui/icons-material/Description'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'

// צבעים יוקרתיים - עיצוב בנקאי
const COLORS = [
  '#1e3a8a', // כחול כהה יוקרתי
  '#059669', // ירוק כהה
  '#dc2626', // אדום כהה
  '#0891b2', // טורקיז
  '#ea580c', // כתום
  '#0891b2', // כחול בהיר
  '#be185d', // ורוד כהה
  '#78350f'  // חום
]

// צבעים לגרפי עמודות
const BAR_COLORS = {
  'תרומות': '#1e3a8a',
  'מלגות': '#059669',
  'תקורות': '#dc2626',
  'תמיכות': '#0891b2',
  'תשלום ספקים': '#f59e0b'
}

const chartCardSx = {
  height: '100%',
  borderRadius: 5,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.1)',
  },
}

const SummaryMetricCard = ({ title, value, subtitle, icon, accent }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 5,
      border: '1px solid #e2e8f0',
      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden',
      height: '100%',
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box
          sx={{
            width: 54,
            height: 54,
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent.main,
            background: accent.soft,
            border: `1px solid ${accent.border}`,
          }}
        >
          {icon}
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            color: accent.main,
            backgroundColor: accent.soft,
          }}
        >
          מדד מרכזי
        </Box>
      </Box>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0f172a', mb: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#334155', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 12, color: '#64748b' }}>
        {subtitle}
      </Typography>
    </CardContent>
  </Card>
)

const DataRowsCard = ({ title, subtitle, rows, total, formatCurrency, onDownloadDetail }) => (
  <Card elevation={0} sx={chartCardSx}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            color: '#0f766e',
            backgroundColor: '#ccfbf1',
            whiteSpace: 'nowrap',
          }}
        >
          {rows.length} שורות
        </Box>
      </Box>

      {rows.length === 0 ? (
        <Box
          sx={{
            borderRadius: 4,
            border: '1px dashed #cbd5e1',
            backgroundColor: '#f8fafc',
            py: 5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>
            אין נתונים זמינים להצגה
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {rows.map((row, index) => {
            const ratio = total > 0 ? Math.min((row.value / total) * 100, 100) : 0
            return (
              <Box
                key={`${title}-${row.name}-${index}`}
                sx={{
                  p: 1.75,
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  backgroundColor: index === 0 ? '#f0fdfa' : '#ffffff',
                  '&:hover': { borderColor: '#94a3b8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
                  transition: 'all 0.15s ease',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 }}>
                    {row.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        ₪{formatCurrency(row.value)}
                      </Typography>
                      {total > 0 && (
                        <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                          {ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}%
                        </Typography>
                      )}
                    </Box>
                    {onDownloadDetail && (
                      <Tooltip title="הורד פירוט אקסל" arrow>
                        <IconButton
                          size="small"
                          onClick={() => onDownloadDetail(title, row.name)}
                          sx={{
                            color: '#0891b2',
                            backgroundColor: '#f0fdfa',
                            border: '1px solid #ccfbf1',
                            '&:hover': {
                              backgroundColor: '#ccfbf1',
                              transform: 'scale(1.08)',
                            },
                            transition: 'all 0.2s ease',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: '#e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${ratio}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #14b8a6 0%, #0f766e 100%)',
                    }}
                  />
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </CardContent>
  </Card>
)

const SummariesPage = ({ externalFilters = null, hideFilterUI = false }) => {
  const { googleSheetsId } = useData()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedFund, setSelectedFund] = useState([]) // מערך של קרנות נבחרות
  const [selectedTransactionType, setSelectedTransactionType] = useState([])
  const [selectedCategory, setSelectedCategory] = useState([]) // מערך של קטגוריות נבחרות
  const [selectedFrame, setSelectedFrame] = useState([]) // מערך של מסגרות נבחרות
  const [selectedMonth, setSelectedMonth] = useState([]) // מערך של חודשים נבחרים
  const [summaries, setSummaries] = useState(null)
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [maorotData, setMaorotData] = useState(() => loadMaorotData())
  const [viewMode, setViewMode] = useState('charts')
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [currentConflict, setCurrentConflict] = useState(null)
  const [conflictResolutions, setConflictResolutions] = useState(() => {
    // טעינת החלטות קונפליקטים מ-localStorage
    try {
      const saved = localStorage.getItem('conflict_resolutions')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const transactionTypes = [
    { value: 'donations', label: 'תרומות' },
    { value: 'scholarships', label: 'מלגות' },
    { value: 'overheads', label: 'תקורות' },
    { value: 'supports', label: 'תמיכות' },
    { value: 'supplierPayments', label: 'תשלום ספקים' }
  ]

  useEffect(() => {
    const loadFunds = () => {
    const existingFunds = getAllFundsWithLabels()
    setFunds(existingFunds)
    }
    
    loadFunds()
    
    // האזנה לעדכוני קרנות
    window.addEventListener('fundsUpdated', loadFunds)
    
    // טעינת נתוני מאורות
    const refreshMaorotData = () => {
      setMaorotData(loadMaorotData())
    }
    window.addEventListener('maorotDataUpdated', refreshMaorotData)
    window.addEventListener('storage', refreshMaorotData)
    
    // ברירת מחדל: חודש זה
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setEndDate(now)
    
    return () => {
      window.removeEventListener('fundsUpdated', loadFunds)
      window.removeEventListener('maorotDataUpdated', refreshMaorotData)
      window.removeEventListener('storage', refreshMaorotData)
    }
  }, [])

  useEffect(() => {
    if (!externalFilters) return
    if (externalFilters.startDate) setStartDate(externalFilters.startDate)
    if (externalFilters.endDate) setEndDate(externalFilters.endDate)
    if (externalFilters.selectedFund) setSelectedFund(externalFilters.selectedFund)
    if (Array.isArray(externalFilters.selectedTransactionTypes)) {
      setSelectedTransactionType(externalFilters.selectedTransactionTypes)
    }
    if (Array.isArray(externalFilters.selectedCategory)) {
      setSelectedCategory(externalFilters.selectedCategory)
    }
    if (externalFilters.autoRun) {
      setTimeout(() => handleGenerateSummary(), 0)
    }
  }, [externalFilters])

  const handleDateRangeChange = (value) => {
    setDateRange(value)
    const now = new Date()
    
    switch (value) {
      case 'year':
        setStartDate(new Date(now.getFullYear(), 0, 1))
        setEndDate(now)
        break
      case 'lastMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
        setEndDate(new Date(now.getFullYear(), now.getMonth(), 0))
        break
      case 'thisMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
        setEndDate(now)
        break
      case 'custom':
        break
      default:
        break
    }
  }

  const handleGenerateSummary = async () => {
    if (!startDate || !endDate) {
      setError('אנא בחר טווח תאריכים')
      return
    }
    
    setLoading(true)
    setError(null)
    setSummaries(null)
    
    try {
      // טעינת נתוני תמיכות ממאורות (לצורך התאמת מסגרות)
      const supports = maorotData.supports || []
      const supportsHeaders = maorotData.supportsHeaders || []
      
      // טעינת שורות מלוח תנועות (Excel) מ-storageService
      let excelRows = []
      const fundsToQuery = selectedFund.length > 0 ? selectedFund : [null]
      for (const f of fundsToQuery) {
        const dataItems = getDataByDateRange(f, startDate, endDate)
        dataItems.forEach(item => {
          const processedData = item.data?.processedData
          if (processedData?.rows) {
            processedData.rows.forEach(row => {
              excelRows.push({ ...row, fund: item.fund, month: item.month })
            })
          }
        })
      }
      
      // טעינת קטגוריות מגוגל שיטס
      // משתמש ב-UNFORMATTED_VALUE כדי לקבל ערכים גולמיים (מספרים כמספרים, לא כמחרוזות מעוצבות)
      // זה פותר בעיות של פורמט מדעי (3.19E+08), סימני מטבע, ומפרידי אלפים
      let gsLookup = new Map()
      let gsLookupById = new Map()
      if (googleSheetsId) {
        try {
          const gsData = await fetchAllCategoriesData(googleSheetsId, 'UNFORMATTED_VALUE')
          if (gsData && gsData.length > 0) {
            const GS_ID_COL = 4, GS_DATE_COL = 1, GS_AMOUNT_COL = 10, GS_CATEGORY_COL = 12, GS_FUND_COL = 15
            let gsSkipped = 0, gsAdded = 0
            for (let i = 1; i < gsData.length; i++) {
              const row = gsData[i]
              if (!row || row.length <= GS_CATEGORY_COL) { gsSkipped++; continue }
              const id = normalizeIdentifier(row[GS_ID_COL])
              if (!id) { gsSkipped++; continue }
              const category = String(row[GS_CATEGORY_COL] || '').trim()
              if (!category) { gsSkipped++; continue }
              
              // פרסינג סכום - תמיכה בפורמט מספרי ומחרוזתי
              let amount = 0
              const rawAmount = row[GS_AMOUNT_COL]
              if (typeof rawAmount === 'number') {
                amount = Math.abs(rawAmount)
              } else {
                let amountStr = String(rawAmount || '').trim()
                // הסרת סימני מטבע, פסיקים, רווחים
                amountStr = amountStr.replace(/[₪$€£¥,\s\u00A0]/g, '')
                // טיפול בסוגריים לפורמט חשבונאי: (1234) → -1234
                if (amountStr.startsWith('(') && amountStr.endsWith(')')) {
                  amountStr = '-' + amountStr.slice(1, -1)
                }
                // טיפול במינוס בסוף: 1234- → -1234
                if (amountStr.endsWith('-') && !amountStr.startsWith('-')) {
                  amountStr = '-' + amountStr.slice(0, -1)
                }
                amount = Math.abs(parseFloat(amountStr) || 0)
              }
              
              // פרסינג תאריך - תמיכה במספר סידורי ובמחרוזת
              const month = extractMonthFromDate(row[GS_DATE_COL])
              const fund = normalizeFundMatchValue(row[GS_FUND_COL])
              const matchKey = buildExactCategoryMatchKey(id, amount, month, fund)
              if (!matchKey) { gsSkipped++; continue }

              if (!gsLookup.has(matchKey)) gsLookup.set(matchKey, [])
              const entry = { id, amount, month, fund, category }
              gsLookup.get(matchKey).push(entry)
              if (!gsLookupById.has(id)) gsLookupById.set(id, [])
              gsLookupById.get(id).push(entry)
              gsAdded++
            }
            console.log(`📊 gsLookup: ${gsAdded} רשומות נוספו, ${gsSkipped} דולגו, ${gsLookup.size} מזהים ייחודיים`)
            
            // דגימת 3 מזהים ראשונים לדיבוג
            let debugCount = 0
            for (const [id, entries] of gsLookup) {
              if (debugCount >= 3) break
              console.log(`  📋 GS מזהה ${id}: ${entries.length} רשומות, דוגמה:`, entries[0])
              debugCount++
            }
          } else {
            console.warn('⚠️ לא נמצאו נתונים בגוגל שיטס')
          }
        } catch (err) {
          console.warn('שגיאה בטעינת קטגוריות מגוגל שיטס:', err)
        }
      } else {
        console.warn('⚠️ googleSheetsId לא מוגדר - לא ניתן לטעון קטגוריות')
      }
      
      // בלשונית מרכז הצדקה מסכמים רק את נתוני קובץ התנועות של הקרנות, בלי קובץ חוזר של מאורות
      const returnFileRows = []
      
      console.log(`📊 נטענו: ${excelRows.length} שורות Excel, ${returnFileRows.length} שורות קובץ חוזר, gsLookup: ${gsLookup.size} מזהים`)
      
      // הדפסת דגימת שורות Excel לדיבוג
      if (excelRows.length > 0) {
        console.log('📋 דגימת Excel:', excelRows.slice(0, 2).map(r => ({ idNumber: r.idNumber, amount: r.amount, date: r.date, fund: r.fund })))
      }
      if (returnFileRows.length > 0) {
        console.log('📋 דגימת קובץ חוזר:', returnFileRows.slice(0, 2).map(r => ({ idNumber: r.idNumber, amount: r.amount, date: r.date, fund: r.fund })))
      }
      
      // יצירת סיכום - עם נתוני Excel ו-GS
      const summary = generateSummaryFromMovements(returnFileRows, supports, supportsHeaders, startDate, endDate, selectedCategory, selectedFrame, selectedMonth, excelRows, gsLookup, gsLookupById)
      
      setSummaries(summary)
    } catch (err) {
      setError(`שגיאה ביצירת סיכום: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // פרסינג סכום מערכי אקסל (מטפל בפורמטים שונים)
  const parseAmountValue = (value) => {
    if (typeof value === 'number') return Math.abs(value)
    if (value === null || value === undefined) return 0
    let str = String(value).trim()
    str = str.replace(/[₪$€£¥,\s\u00A0]/g, '')
    if (str.startsWith('(') && str.endsWith(')')) {
      str = '-' + str.slice(1, -1)
    }
    if (str.endsWith('-') && !str.startsWith('-')) {
      str = '-' + str.slice(0, -1)
    }
    return Math.abs(parseFloat(str) || 0)
  }

  const normalizeFundMatchValue = (fundValue) => {
    const fundStr = String(fundValue || '').trim()
    if (!fundStr) return ''
    const baseValue = fundStr.split(' - ')[0].trim()
    return baseValue.replace(/\.0+$/, '')
  }

  const buildExactCategoryMatchKey = (idNumber, amount, dateOrMonth, fund) => {
    const normalizedId = normalizeIdentifier(idNumber)
    const normalizedMonth = extractMonthFromDate(dateOrMonth)
    const normalizedFund = normalizeFundMatchValue(fund)
    const normalizedAmount = parseAmountValue(amount)

    if (!normalizedId || !normalizedMonth || !normalizedFund || normalizedAmount <= 0) {
      return null
    }

    return [
      normalizedId,
      normalizedMonth,
      normalizedAmount.toFixed(2),
      normalizedFund,
    ].join('|')
  }

  // פונקציה למציאת קטגוריה מגוגל שיטס לפי מ.ז + סכום + חודש + קרן
  const findCategoryFromGS = (gsLookup, idNumber, amount, dateOrMonth, fund, debugRow = false) => {
    if (!gsLookup || gsLookup.size === 0) return null
    const matchKey = buildExactCategoryMatchKey(idNumber, amount, dateOrMonth, fund)
    
    if (debugRow) {
      console.log(`  🔍 findCategoryFromGS: key=${matchKey || 'null'}`)
    }
    
    if (!matchKey) return null
    const entries = gsLookup.get(matchKey)
    if (!entries || entries.length === 0) return null

    if (debugRow) {
      console.log(`  ✅ נמצאה קטגוריה בהתאמה חד משמעית: ${entries[0]?.category}`)
      console.log(`  📋 GS entries:`, entries)
    }

    const uniqueCategories = [...new Set(entries.map((entry) => entry.category).filter(Boolean))]
    return uniqueCategories.length === 1 ? uniqueCategories[0] : null
  }

  // פונקציית עזר לפרסינג תאריך מפורמטים שונים (כולל Excel serial number)
  const parseRowDate = (dateValue) => {
    if (!dateValue) return null
    if (dateValue instanceof Date) {
      if (Number.isNaN(dateValue.getTime())) return null
      return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
    }
    if (typeof dateValue === 'number') {
      const wholeDays = Math.floor(dateValue)
      const excelEpochUtc = Date.UTC(1899, 11, 30)
      const utcDate = new Date(excelEpochUtc + wholeDays * 86400000)
      return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
    }
    if (typeof dateValue === 'string') {
      const dateParts = dateValue.split('/')
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      return new Date(dateValue)
    }
    return null
  }

  // פונקציה ליצירת סיכום מלוח תנועות
  const generateSummaryFromMovements = (returnFileRows, supports, supportsHeaders, startDate, endDate, selectedCategory = [], selectedFrame = [], selectedMonth = [], excelRows = [], gsLookup = null, gsLookupById = null) => {
    const normalizedStartDate =
      startDate instanceof Date && !Number.isNaN(startDate.getTime())
        ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
        : null
    const normalizedEndDate =
      endDate instanceof Date && !Number.isNaN(endDate.getTime())
        ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
        : null

    const categoryIndex = findColumnIndex(supportsHeaders, ['קטגוריה', 'category'], null)
    const frameIndex = findColumnIndex(supportsHeaders, ['מסגרת', 'frame'], null)
    
    const supportLookup = new Map()
    supports.forEach((support) => {
      const identifiers = buildSupportIdentifiers(support, supportsHeaders)
      identifiers.forEach((id) => {
        if (id) supportLookup.set(id, support)
      })
    })
    
    const summary = {
      byFund: {},
      byOrganization: {},
      byFundAndOrganization: {},
      byTransactionType: {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supplierPayments: 0
      },
      byCategory: {},
      byFrame: {},
      byMonth: {},
      total: {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supplierPayments: 0,
        supportsByCategory: {},
        totalAmount: 0
      },
      supportRowsByCategory: {},
      rowsByTransactionType: {
        donations: [],
        scholarships: [],
        overheads: [],
        supports: [],
        supplierPayments: [],
      },
      rowsByFund: {},
      rowsByMonth: {},
      conflicts: []
    }
    
    // מונה שורות לדיבוג
    let processedRowCount = 0
    let matchedCategoryCount = 0
    const seenMovementKeys = new Set()
    
    // פונקציה פנימית לעיבוד שורה
    const processRow = (row, isExcelRow = false) => {
      if (isExcelRow) {
        const movementId = row?.rawRow?.[12]
        const detailId = row?.rawRow?.[13]
        const movementKey = `${row.fund || ''}_${movementId || ''}_${detailId || ''}`

        if ((movementId || detailId) && seenMovementKeys.has(movementKey)) {
          return
        }

        if (movementId || detailId) {
          seenMovementKeys.add(movementKey)
        }
      }

      let rowDate = parseRowDate(row.date)
      
      if (
        rowDate &&
        !Number.isNaN(rowDate.getTime()) &&
        ((normalizedStartDate && rowDate < normalizedStartDate) ||
          (normalizedEndDate && rowDate > normalizedEndDate))
      ) {
        return
      }
      
      const idCandidates = [
        normalizeIdentifier(row.idNumber),
        normalizeIdentifier(row.generalSupplierNumber),
        normalizeIdentifier(row.maorotSupplierNumber),
      ].filter(Boolean)
      
      let supportMatch = null
      for (const id of idCandidates) {
        if (supportLookup.has(id)) {
          supportMatch = supportLookup.get(id)
          break
        }
      }
      
      const signedMovementAmount = isExcelRow ? getRowGrossAmount(row) : parseFinancialNumber(row.amount)
      const amount = Math.abs(signedMovementAmount)
      const overheadAmount = isExcelRow ? getRowOverheadAmount(row) : 0
      if (amount === 0 && overheadAmount === 0) return
      
      processedRowCount++
      const isDebugRow = processedRowCount <= 5
      
      if (isDebugRow) {
        console.log(`\n🔎 === שורה ${processedRowCount} (${isExcelRow ? 'Excel' : 'קובץ חוזר'}) ===`)
        console.log(`  📄 idNumber=${row.idNumber}, amount=${row.amount}, date=${row.date}, fund=${row.fund}, month=${row.month}`)
        console.log(`  📄 idCandidates=${JSON.stringify(idCandidates)}, gsLookup size=${gsLookup?.size || 0}`)
      }
      
      // === סוג תנועה ===
      let transactionType = isExcelRow ? null : 'supports'
      if (isExcelRow && row.type) {
        const typeStr = String(row.type).trim().toLowerCase()
        if (typeStr.includes('תרומה') || typeStr.includes('donation')) transactionType = 'donations'
        else if (typeStr.includes('מלגה') || typeStr.includes('scholarship')) transactionType = 'scholarships'
        else if (typeStr.includes('תקורה') || typeStr.includes('עמלה') || typeStr.includes('overhead')) transactionType = 'overheads'
        else if (typeStr.includes('תשלום ספקים') || typeStr.includes('ספקים')) transactionType = 'supplierPayments'
        else if (typeStr.includes('תמיכות') || typeStr.includes('תמיכה') || typeStr.includes('support')) transactionType = 'supports'
      }

      if (!transactionType && isExcelRow) {
        if (isDebugRow) {
          console.log(`  ⚠️ שורה לא מסווגת, מדלג: type=${row.type}, amount=${signedMovementAmount}`)
        }
        return
      }

      const isSupportTransaction = transactionType === 'supports'

      // === קטגוריה - רק עבור תמיכות ===
      let categoryValue = 'לא סווג'
      if (isSupportTransaction) {
        if (gsLookup && gsLookup.size > 0) {
          for (const id of idCandidates) {
            const gsCategory = findCategoryFromGS(gsLookup, id, amount, row.date || row.month, row.fund, isDebugRow)
            if (gsCategory) {
              categoryValue = gsCategory
              break
            }
            if (isDebugRow && gsLookupById?.has(normalizeIdentifier(id))) {
              console.log(
                `  🧩 רשומות GS עם אותו מ.ז (${id}) אך מפתח שונה:`,
                gsLookupById.get(normalizeIdentifier(id))
              )
            }
          }
        } else if (isDebugRow) {
          console.log('  ❌ gsLookup ריק או null!')
        }

        if (categoryValue !== 'לא סווג') {
          matchedCategoryCount++
        }

        if (categoryValue === 'לא סווג' && supportMatch && Number.isInteger(categoryIndex) && Array.isArray(supportMatch.rawRow)) {
          const val = normalizeString(supportMatch.rawRow[categoryIndex])
          if (val) categoryValue = val
        }
      }

      const frameValue = isSupportTransaction && supportMatch && Number.isInteger(frameIndex) && Array.isArray(supportMatch.rawRow)
        ? normalizeString(supportMatch.rawRow[frameIndex]) || 'לא סווג'
        : 'לא סווג'
      
      // חילוץ חודש מתאריך - פורמט MM/YYYY
      let monthKey = 'ללא תאריך'
      if (rowDate && !isNaN(rowDate.getTime())) {
        const month = String(rowDate.getMonth() + 1).padStart(2, '0')
        const year = rowDate.getFullYear()
        monthKey = `${month}/${year}`
      } else if (row.date) {
        const dateStr = String(row.date)
        const dateParts = dateStr.split('/')
        if (dateParts.length === 3) {
          const [, month, year] = dateParts
          monthKey = `${month}/${year}`
        }
      }
      
      // סינון לפי קטגוריה, מסגרת וחודש
      if (selectedCategory.length > 0 && (!isSupportTransaction || !selectedCategory.includes(categoryValue))) return
      if (selectedFrame.length > 0 && (!isSupportTransaction || !selectedFrame.includes(frameValue))) return
      if (selectedMonth.length > 0 && !selectedMonth.includes(monthKey)) return
      
      if (isSupportTransaction) {
        if (!summary.byCategory[categoryValue]) summary.byCategory[categoryValue] = 0
        summary.byCategory[categoryValue] += signedMovementAmount

        if (!summary.byFrame[frameValue]) summary.byFrame[frameValue] = 0
        summary.byFrame[frameValue] += signedMovementAmount

        if (!summary.total.supportsByCategory[categoryValue]) {
          summary.total.supportsByCategory[categoryValue] = 0
        }
        summary.total.supportsByCategory[categoryValue] += signedMovementAmount

        if (!summary.supportRowsByCategory[categoryValue]) {
          summary.supportRowsByCategory[categoryValue] = []
        }
        summary.supportRowsByCategory[categoryValue].push({
          fund: row.fund || '',
          date: row.date || row.month || '',
          month: monthKey,
          amount: signedMovementAmount,
          idNumber: row.idNumber || '',
          name: row.name || '',
          movementId: row?.rawRow?.[12] || '',
          detailId: row?.rawRow?.[13] || '',
        })
      }

      if (!summary.byMonth[monthKey]) summary.byMonth[monthKey] = 0
      summary.byMonth[monthKey] += signedMovementAmount

      // שמירת שורה מפורטת לכל סוגי הפעולות
      const detailRow = {
        fund: row.fund || '',
        date: row.date || row.month || '',
        month: monthKey,
        amount: signedMovementAmount,
        overheadAmount: overheadAmount,
        idNumber: row.idNumber || '',
        name: row.name || '',
        type: row.type || transactionType,
        category: isSupportTransaction ? categoryValue : '',
        movementId: row?.rawRow?.[12] || '',
        detailId: row?.rawRow?.[13] || '',
      }

      if (transactionType && summary.rowsByTransactionType[transactionType]) {
        summary.rowsByTransactionType[transactionType].push(detailRow)
      }
      if (row.fund) {
        if (!summary.rowsByFund[row.fund]) summary.rowsByFund[row.fund] = []
        summary.rowsByFund[row.fund].push(detailRow)
      }
      if (monthKey) {
        if (!summary.rowsByMonth[monthKey]) summary.rowsByMonth[monthKey] = []
        summary.rowsByMonth[monthKey].push(detailRow)
      }

      if (transactionType !== 'overheads') {
        summary.byTransactionType[transactionType] = (summary.byTransactionType[transactionType] || 0) + signedMovementAmount
        summary.total[transactionType] = (summary.total[transactionType] || 0) + signedMovementAmount
        summary.total.totalAmount += signedMovementAmount
      }

      if (overheadAmount > 0) {
        summary.byTransactionType.overheads = (summary.byTransactionType.overheads || 0) + overheadAmount
        summary.total.overheads = (summary.total.overheads || 0) + overheadAmount
      }
      
      // עדכון סיכומים - קרן
      if (row.fund) {
        if (!summary.byFund[row.fund]) {
          summary.byFund[row.fund] = { donations: 0, scholarships: 0, overheads: 0, supports: 0, supplierPayments: 0, supportsByCategory: {}, totalAmount: 0 }
        }
        if (transactionType !== 'overheads') {
          summary.byFund[row.fund][transactionType] = (summary.byFund[row.fund][transactionType] || 0) + signedMovementAmount
          summary.byFund[row.fund].totalAmount += signedMovementAmount
          if (isSupportTransaction && !summary.byFund[row.fund].supportsByCategory[categoryValue]) {
            summary.byFund[row.fund].supportsByCategory[categoryValue] = 0
          }
          if (isSupportTransaction) {
            summary.byFund[row.fund].supportsByCategory[categoryValue] += signedMovementAmount
          }
        }
        if (overheadAmount > 0) {
          summary.byFund[row.fund].overheads = (summary.byFund[row.fund].overheads || 0) + overheadAmount
        }
      }
    }
    
    // עיבוד שורות מקובץ חוזר (returnFileRows)
    returnFileRows.forEach(row => processRow(row, false))
    
    // עיבוד שורות מלוח תנועות (Excel) מ-storageService
    excelRows.forEach(row => processRow(row, true))
    
    console.log(`📊 סיכום עיבוד: ${processedRowCount} שורות עובדו, ${matchedCategoryCount} קטגוריות מגוגל שיטס מותאמו`)
    console.log(`📊 קטגוריות שנמצאו:`, Object.keys(summary.byCategory))
    if (summary.supportRowsByCategory['הכנסת כלה']) {
      console.log(
        '🎯 שורות תמיכה בקטגוריה "הכנסת כלה" (JSON):',
        JSON.stringify(summary.supportRowsByCategory['הכנסת כלה'], null, 2)
      )
      console.log(
        '🎯 סה"כ "הכנסת כלה":',
        summary.supportRowsByCategory['הכנסת כלה'].reduce((sum, row) => sum + (row.amount || 0), 0)
      )
    }
    
    return summary
  }

  const handleConflicts = (conflicts) => {
    if (conflicts.length > 0) {
      setCurrentConflict(conflicts[0])
      setConflictModalOpen(true)
    }
  }

  const handleConflictResolve = async (conflict, selectedCategory) => {
    const conflictKey = `${conflict.idNumber}_${conflict.date}_${conflict.amount}`
    const newResolutions = {
      ...conflictResolutions,
      [conflictKey]: selectedCategory
    }
    setConflictResolutions(newResolutions)
    
    // שמירה ב-localStorage
    try {
      localStorage.setItem('conflict_resolutions', JSON.stringify(newResolutions))
    } catch (err) {
      console.warn('שגיאה בשמירת החלטות קונפליקט:', err)
    }
    
    setConflictModalOpen(false)
    
    // עדכון הסיכומים עם הקטגוריה שנבחרה
    if (summaries && conflict.row) {
      // עדכון הסיכום עם הקטגוריה שנבחרה
      const amount = conflict.amount || 0
      const category = selectedCategory
      
      // עדכון summary.byCategory
      if (!summaries.byCategory[category]) {
        summaries.byCategory[category] = 0
      }
      summaries.byCategory[category] += Math.abs(amount)
      
      // עדכון supportsByCategory בכל המקומות הרלוונטיים
      const fundKey = conflict.fund
      const organization = conflict.organization || 'מרכז הצדקה'
      
      if (summaries.byFund[fundKey]) {
        if (!summaries.byFund[fundKey].supportsByCategory[category]) {
          summaries.byFund[fundKey].supportsByCategory[category] = 0
        }
        summaries.byFund[fundKey].supportsByCategory[category] += Math.abs(amount)
      }
      
      if (summaries.byOrganization[organization]) {
        if (!summaries.byOrganization[organization].supportsByCategory[category]) {
          summaries.byOrganization[organization].supportsByCategory[category] = 0
        }
        summaries.byOrganization[organization].supportsByCategory[category] += Math.abs(amount)
      }
      
      if (summaries.byFundAndOrganization[fundKey]?.[organization]) {
        if (!summaries.byFundAndOrganization[fundKey][organization].supportsByCategory[category]) {
          summaries.byFundAndOrganization[fundKey][organization].supportsByCategory[category] = 0
        }
        summaries.byFundAndOrganization[fundKey][organization].supportsByCategory[category] += Math.abs(amount)
      }
      
      if (summaries.total) {
        if (!summaries.total.supportsByCategory[category]) {
          summaries.total.supportsByCategory[category] = 0
        }
        summaries.total.supportsByCategory[category] += Math.abs(amount)
      }
      
      // עדכון state
      setSummaries({ ...summaries })
    }
    
    // מציאת קונפליקט הבא שלא נפתר
    if (summaries && summaries.conflicts) {
      const nextConflict = summaries.conflicts.find(c => {
        const key = `${c.idNumber}_${c.date}_${c.amount}`
        return !newResolutions[key]
      })
      
      if (nextConflict) {
        setTimeout(() => {
          setCurrentConflict(nextConflict)
          setConflictModalOpen(true)
        }, 300)
      }
    }
  }

  const formatCurrency = (amount) => {
    return amount?.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
  }

  const formatWholeNumber = (amount) => {
    return amount?.toLocaleString('he-IL', { maximumFractionDigits: 0 }) || '0'
  }

  const formatDateInputValue = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toISOString().split('T')[0]
  }

  const filterFieldSx = {
    '& .MuiInputLabel-root': {
      color: '#64748b',
      fontWeight: 500,
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: 3.5,
      backgroundColor: '#f8fafc',
      '& fieldset': {
        borderColor: '#e2e8f0',
      },
      '&:hover fieldset': {
        borderColor: '#94a3b8',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#14b8a6',
        borderWidth: 1.5,
      },
    },
    '& .MuiSvgIcon-root': {
      color: '#64748b',
    },
  }

  // Refs לכל גרף להורדה - רק את ה-ResponsiveContainer (הגרף עצמו)
  const transactionTypeChartRef = useRef(null)
  const categoryChartRef = useRef(null)
  const fundChartRef = useRef(null)
  const orgChartRef = useRef(null)
  const fundOrgChartRef = useRef(null)
  const monthChartRef = useRef(null)

  // פונקציה להורדת גרף כתמונה - רק את הגרף ללא כותרת ואייקון
  const downloadChartAsImage = async (chartRef, chartName) => {
    if (!chartRef.current) {
      console.error('Chart ref not found')
      return
    }

    try {
      // מחפש את ה-ResponsiveContainer בתוך ה-Card
      const responsiveContainer = chartRef.current.querySelector('.recharts-responsive-container')
      const chartElement = responsiveContainer || chartRef.current.querySelector('svg') || chartRef.current
      
      // קבלת הגבולות המדויקים של האלמנט
      const rect = chartElement.getBoundingClientRect()
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // איכות גבוהה
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: rect.width,
        height: rect.height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      })

      // יצירת קישור הורדה
      const link = document.createElement('a')
      const fileName = `סיכום_${chartName}_${new Date().toISOString().split('T')[0]}.png`
      link.download = fileName
      link.href = canvas.toDataURL('image/png', 1.0)
      
      // הוספת הקישור ל-DOM, לחיצה, והסרה
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting chart:', error)
      alert('שגיאה בייצוא התמונה. נסה שוב.')
    }
  }

  // ========== פונקציות ייצוא Excel ==========
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null)

  // המרת תאריך Excel serial למחרוזת DD/MM/YYYY
  const excelDateToFormatted = (dateValue) => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string') {
      // אם כבר מחרוזת — נשאיר כמו שהוא (אלא אם כן זה פורמט ISO)
      if (dateValue.includes('T') || dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = new Date(dateValue)
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        }
      }
      return dateValue
    }
    if (typeof dateValue === 'number') {
      const wholeDays = Math.floor(dateValue)
      const excelEpochUtc = Date.UTC(1899, 11, 30)
      const utcDate = new Date(excelEpochUtc + wholeDays * 86400000)
      const d = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      }
    }
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return `${String(dateValue.getDate()).padStart(2, '0')}/${String(dateValue.getMonth() + 1).padStart(2, '0')}/${dateValue.getFullYear()}`
    }
    return String(dateValue)
  }

  const createExcelWorkbook = (sheets) => {
    const wb = XLSX.utils.book_new()
    // הגדרת כיוון RTL ברמת החוברת
    if (!wb.Workbook) wb.Workbook = {}
    if (!wb.Workbook.Views) wb.Workbook.Views = []
    wb.Workbook.Views[0] = { RTL: true }

    sheets.forEach(({ name, data }) => {
      if (!data || data.length === 0) return
      const ws = XLSX.utils.json_to_sheet(data)
      // הגדרת RTL ברמת הגיליון
      ws['!sheetViews'] = [{ rightToLeft: true }]
      if (!ws['!outline']) ws['!outline'] = {}
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      ws['!cols'] = []
      for (let C = range.s.c; C <= range.e.c; ++C) {
        ws['!cols'][C] = { wch: 22 }
      }
      const safeName = name.replace(/[\\/*?:\[\]]/g, '_').slice(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, safeName)
    })
    return wb
  }

  const downloadExcelFile = (wb, fileName) => {
    XLSX.writeFile(wb, fileName)
  }

  const formatDetailRows = (rows, overrideCategory) => {
    return rows.map(r => ({
      'קרן': r.fund,
      'תאריך': excelDateToFormatted(r.date),
      'חודש': r.month,
      'מ.ז': r.idNumber,
      'שם': r.name,
      'סוג': r.type,
      'קטגוריה': overrideCategory || r.category || '',
      'סכום': r.amount,
      'תקורות': r.overheadAmount || 0,
    }))
  }

  // 1) אקסל סיכום — שורת סה"כ לכל סוג
  const handleDownloadSummary = () => {
    if (!summaries) return
    setDownloadMenuAnchor(null)
    const data = [
      { 'סוג': 'תרומות', 'סכום': summaries.byTransactionType?.donations || 0 },
      { 'סוג': 'תמיכות', 'סכום': summaries.byTransactionType?.supports || 0 },
      { 'סוג': 'תקורות', 'סכום': summaries.byTransactionType?.overheads || 0 },
      { 'סוג': 'מלגות', 'סכום': summaries.byTransactionType?.scholarships || 0 },
      { 'סוג': 'תשלום ספקים', 'סכום': summaries.byTransactionType?.supplierPayments || 0 },
    ]
    // קטגוריות תמיכה — ממוינות מהנמוך לגבוה
    const catRows = Object.entries(summaries.byCategory || {})
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))
      .map(([cat, val]) => ({ 'קטגוריה': cat, 'סכום': val }))

    const sheets = [
      { name: 'סיכום כללי', data },
      ...(catRows.length > 0 ? [{ name: 'קטגוריות תמיכה', data: catRows }] : []),
    ]
    const wb = createExcelWorkbook(sheets)
    downloadExcelFile(wb, `סיכום_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 2) אקסל מורחב — כל הפירוטים
  const handleDownloadExpanded = () => {
    if (!summaries) return
    setDownloadMenuAnchor(null)

    const overviewData = [
      { 'סוג': 'תרומות', 'סכום': summaries.byTransactionType?.donations || 0 },
      { 'סוג': 'תמיכות', 'סכום': summaries.byTransactionType?.supports || 0 },
      { 'סוג': 'תקורות', 'סכום': summaries.byTransactionType?.overheads || 0 },
      { 'סוג': 'מלגות', 'סכום': summaries.byTransactionType?.scholarships || 0 },
      { 'סוג': 'תשלום ספקים', 'סכום': summaries.byTransactionType?.supplierPayments || 0 },
    ]
    const catRows = Object.entries(summaries.byCategory || {})
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))
      .map(([cat, val]) => ({ 'קטגוריה': cat, 'סכום': val }))

    const sheets = [
      { name: 'סיכום כללי', data: overviewData },
    ]

    // גיליון פירוט לכל סוג תנועה
    const typeNames = {
      donations: 'תרומות',
      supports: 'תמיכות',
      overheads: 'תקורות',
      scholarships: 'מלגות',
      supplierPayments: 'תשלום ספקים',
    }
    Object.entries(summaries.rowsByTransactionType || {}).forEach(([type, rows]) => {
      if (rows.length > 0) {
        sheets.push({ name: `פירוט ${typeNames[type] || type}`, data: formatDetailRows(rows) })
      }
    })

    if (catRows.length > 0) {
      sheets.push({ name: 'קטגוריות תמיכה', data: catRows })
    }

    // פירוט לפי קטגוריה
    Object.entries(summaries.supportRowsByCategory || {}).forEach(([cat, rows]) => {
      if (rows.length > 0) {
        const safeCat = cat.replace(/[\\/*?:\[\]]/g, '_').slice(0, 25)
        sheets.push({
          name: `ק ${safeCat}`,
          data: rows.map(r => ({
            'קרן': r.fund,
            'תאריך': excelDateToFormatted(r.date),
            'חודש': r.month,
            'מ.ז': r.idNumber,
            'שם': r.name,
            'קטגוריה': cat,
            'סכום': r.amount,
          }))
        })
      }
    })

    const wb = createExcelWorkbook(sheets)
    downloadExcelFile(wb, `סיכום_מורחב_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 3) אקסל סיכום לפי בחירה — לפי הפילטרים הנוכחיים
  const handleDownloadFiltered = () => {
    if (!summaries || !chartData) return
    setDownloadMenuAnchor(null)

    const sheets = []

    if (chartData.transactionTypeData.length > 0) {
      sheets.push({
        name: 'סוגי פעולה',
        data: chartData.transactionTypeData.map(i => ({ 'סוג': i.name, 'סכום': i.amount }))
      })
    }
    if (chartData.categoryData.length > 0) {
      sheets.push({
        name: 'קטגוריות',
        data: chartData.categoryData.map(i => ({ 'קטגוריה': i.name, 'סכום': i.amount }))
      })
    }
    if (chartData.fundData.length > 0) {
      sheets.push({
        name: 'קרנות',
        data: chartData.fundData.map(i => ({
          'קרן': i.name,
          'תרומות': i['תרומות'] || 0,
          'תמיכות': i['תמיכות'] || 0,
          'תקורות': i['תקורות'] || 0,
          'מלגות': i['מלגות'] || 0,
          'תשלום ספקים': i['תשלום ספקים'] || 0,
          'סה"כ': i['סה"כ'] || 0,
        }))
      })
    }
    if (chartData.monthData.length > 0) {
      sheets.push({
        name: 'חודשים',
        data: chartData.monthData.map(i => ({ 'חודש': i.name, 'סכום': i.amount }))
      })
    }

    if (sheets.length === 0) {
      alert('אין נתונים להורדה')
      return
    }
    const wb = createExcelWorkbook(sheets)
    downloadExcelFile(wb, `סיכום_מסונן_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 4) הורדת פירוט שורות לקטגוריה / סוג / קרן / חודש ספציפי
  const handleDownloadDetailRows = (sectionTitle, rowName) => {
    if (!summaries) return

    let rows = []
    let sheetName = rowName

    // מציאת השורות המתאימות
    if (sectionTitle === 'סוגי פעולה') {
      const typeMap = {
        'תרומות': 'donations',
        'מלגות': 'scholarships',
        'תקורות': 'overheads',
        'תמיכות': 'supports',
        'תשלום ספקים': 'supplierPayments',
      }
      const key = typeMap[rowName]
      if (key && summaries.rowsByTransactionType?.[key]) {
        rows = summaries.rowsByTransactionType[key]
      }
    } else if (sectionTitle === 'קטגוריות') {
      if (summaries.supportRowsByCategory?.[rowName]) {
        rows = summaries.supportRowsByCategory[rowName]
      }
    } else if (sectionTitle === 'קרנות') {
      if (summaries.rowsByFund?.[rowName]) {
        rows = summaries.rowsByFund[rowName]
      }
    } else if (sectionTitle === 'חודשים') {
      if (summaries.rowsByMonth?.[rowName]) {
        rows = summaries.rowsByMonth[rowName]
      }
    } else if (sectionTitle === 'ארגונים') {
      // filter rows from all transaction types where name matches
      const allRows = Object.values(summaries.rowsByTransactionType || {}).flat()
      rows = allRows.filter(r => r.name === rowName)
    } else if (sectionTitle === 'קרן וארגון') {
      // rowName is "fund - org"
      const parts = rowName.split(' - ')
      const fund = parts[0]
      if (summaries.rowsByFund?.[fund]) {
        rows = summaries.rowsByFund[fund]
      }
    }

    if (rows.length === 0) {
      alert('אין שורות פירוט להורדה')
      return
    }

    // אם הורדנו מקטגוריה ספציפית — נמלא את עמודת הקטגוריה בשם הקטגוריה
    const categoryOverride = sectionTitle === 'קטגוריות' ? rowName : null

    const formattedRows = rows.map(r => ({
      'קרן': r.fund,
      'תאריך': excelDateToFormatted(r.date),
      'חודש': r.month,
      'מ.ז': r.idNumber,
      'שם': r.name,
      'סוג': r.type || '',
      'קטגוריה': categoryOverride || r.category || '',
      'סכום': r.amount,
      'תקורות': r.overheadAmount || 0,
    }))

    const safeName = rowName.replace(/[\\/*?:\[\]]/g, '_').slice(0, 25)
    const wb = createExcelWorkbook([{ name: safeName, data: formattedRows }])
    downloadExcelFile(wb, `פירוט_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // הכנת נתונים לגרפים עם סינון
  const chartData = useMemo(() => {
    if (!summaries) return null

    // סינון לפי סוג פעולה
    let filteredTransactionTypes = {
      donations: summaries.byTransactionType.donations,
      scholarships: summaries.byTransactionType.scholarships,
      overheads: summaries.byTransactionType.overheads,
      supports: summaries.byTransactionType.supports,
      supplierPayments: summaries.byTransactionType.supplierPayments,
    }

    if (selectedTransactionType && selectedTransactionType.length > 0) {
      // אם נבחר סוג פעולה ספציפי, נציג רק אותו
      const typeMap = {
        'donations': 'donations',
        'scholarships': 'scholarships',
        'overheads': 'overheads',
        'supports': 'supports',
        'supplierPayments': 'supplierPayments'
      }
      const selectedTypes = selectedTransactionType
        .map((type) => typeMap[type])
        .filter(Boolean)
      filteredTransactionTypes = Object.keys(filteredTransactionTypes).reduce((acc, key) => {
        acc[key] = selectedTypes.includes(key) ? filteredTransactionTypes[key] : 0
        return acc
      }, {})
    }

    // נתונים לפי סוג פעולה
    const transactionTypeData = [
      { name: 'תרומות', value: Math.abs(filteredTransactionTypes.donations || 0), amount: filteredTransactionTypes.donations || 0 },
      { name: 'מלגות', value: Math.abs(filteredTransactionTypes.scholarships || 0), amount: filteredTransactionTypes.scholarships || 0 },
      { name: 'תקורות', value: Math.abs(filteredTransactionTypes.overheads || 0), amount: filteredTransactionTypes.overheads || 0 },
      { name: 'תמיכות', value: Math.abs(filteredTransactionTypes.supports || 0), amount: filteredTransactionTypes.supports || 0 },
      { name: 'תשלום ספקים', value: Math.abs(filteredTransactionTypes.supplierPayments || 0), amount: filteredTransactionTypes.supplierPayments || 0 },
    ].filter(item => item.value > 0 && !isNaN(item.value) && isFinite(item.value))

    // נתונים לפי קרן - עם סינון
    let fundEntries = Object.entries(summaries.byFund)
    if (selectedFund && selectedFund.length > 0) {
      fundEntries = fundEntries.filter(([fund]) => selectedFund.includes(fund))
    }
    const fundData = fundEntries.map(([fund, data]) => {
      let filteredData = { ...data }
      if (selectedTransactionType && selectedTransactionType.length > 0) {
        const typeMap = {
          'donations': 'donations',
          'scholarships': 'scholarships',
          'overheads': 'overheads',
          'supports': 'supports',
          'supplierPayments': 'supplierPayments'
        }
        const selectedTypes = selectedTransactionType
          .map((type) => typeMap[type])
          .filter(Boolean)
        filteredData = {
          donations: selectedTypes.includes('donations') ? data.donations : 0,
          scholarships: selectedTypes.includes('scholarships') ? data.scholarships : 0,
          overheads: selectedTypes.includes('overheads') ? data.overheads : 0,
          supports: selectedTypes.includes('supports') ? data.supports : 0,
          supplierPayments: selectedTypes.includes('supplierPayments') ? data.supplierPayments : 0,
          totalAmount: selectedTypes.reduce((acc, type) => acc + (data[type] || 0), 0),
          supportsByCategory: data.supportsByCategory || {}
        }
      }
      return {
        name: fund,
        תרומות: filteredData.donations,
        מלגות: filteredData.scholarships,
        תקורות: filteredData.overheads,
        תמיכות: filteredData.supports,
        'תשלום ספקים': filteredData.supplierPayments,
        'סה"כ': filteredData.totalAmount
      }
    })

    // נתונים לפי ארגון - עם סינון
    let orgEntries = Object.entries(summaries.byOrganization)
      .filter(([_, data]) => data.totalAmount !== 0)
    
    const orgData = orgEntries.map(([org, data]) => {
      let filteredData = { ...data }
      
      // סינון לפי סוג פעולה
      if (selectedTransactionType && selectedTransactionType.length > 0) {
        const typeMap = {
          'donations': 'donations',
          'scholarships': 'scholarships',
          'overheads': 'overheads',
          'supports': 'supports',
          'supplierPayments': 'supplierPayments'
        }
        const selectedTypes = selectedTransactionType
          .map((type) => typeMap[type])
          .filter(Boolean)
        filteredData = {
          donations: selectedTypes.includes('donations') ? data.donations : 0,
          scholarships: selectedTypes.includes('scholarships') ? data.scholarships : 0,
          overheads: selectedTypes.includes('overheads') ? data.overheads : 0,
          supports: selectedTypes.includes('supports') ? data.supports : 0,
          supplierPayments: selectedTypes.includes('supplierPayments') ? data.supplierPayments : 0,
          totalAmount: selectedTypes.reduce((acc, type) => acc + (data[type] || 0), 0),
          supportsByCategory: data.supportsByCategory || {}
        }
      }
      
      return {
        name: org,
        תרומות: filteredData.donations,
        מלגות: filteredData.scholarships,
        תקורות: filteredData.overheads,
        תמיכות: filteredData.supports,
        'תשלום ספקים': filteredData.supplierPayments,
        'סה"כ': filteredData.totalAmount
      }
    })

    // נתונים לפי קטגוריה - עם סינון
    // ניקוי קטגוריות עם ערכים לא תקינים
    let categoryEntries = Object.entries(summaries.byCategory || {})
      .filter(([category, amount]) => {
        // מסנן קטגוריות ללא שם או עם ערך לא תקין
        if (!category || category.trim() === '' || category === 'undefined' || category === 'null') {
          return false
        }
        const numAmount = Number(amount)
        return !isNaN(numAmount) && isFinite(numAmount) && numAmount !== 0
      })
    
    // סינון לפי קטגוריות נבחרות
    if (selectedCategory && selectedCategory.length > 0) {
      categoryEntries = categoryEntries.filter(([category]) => selectedCategory.includes(category))
    }
    
    const categoryData = categoryEntries
      .filter(([category, amount]) => {
        // מסנן קטגוריות ללא שם, עם ערך null/undefined, או עם ערך 0
        const numAmount = Math.abs(amount || 0)
        return category && category.trim() !== '' && numAmount > 0
      })
      .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1])) // מיון מהנמוך לגבוה
      // הסרת הגבלה - הצגת כל הקטגוריות
      .map(([category, amount]) => ({
        name: category || 'ללא שם',
        value: Math.abs(amount || 0),
        amount: amount || 0
      }))
      .filter(item => item.value > 0) // סינון נוסף לוודא שאין ערכים של 0

    // נתונים לפי קרן וארגון - עם סינון
    let fundOrgEntries = Object.entries(summaries.byFundAndOrganization)
    
    // סינון לפי קרנות נבחרות
    if (selectedFund && selectedFund.length > 0) {
      fundOrgEntries = fundOrgEntries.filter(([fund]) => selectedFund.includes(fund))
    }
    
    const fundOrgData = fundOrgEntries.flatMap(([fund, orgs]) => {
      let filteredOrgs = Object.entries(orgs)
      
      // סינון לפי סוג פעולה
      if (selectedTransactionType && selectedTransactionType.length > 0) {
        const typeMap = {
          'donations': 'donations',
          'scholarships': 'scholarships',
          'overheads': 'overheads',
          'supports': 'supports'
        }
        const selectedTypes = selectedTransactionType
          .map((type) => typeMap[type])
          .filter(Boolean)
        filteredOrgs = filteredOrgs.map(([org, data]) => [
          org,
          {
            ...data,
            totalAmount: selectedTypes.reduce((acc, type) => acc + (data[type] || 0), 0)
          }
        ])
      }
      
      return filteredOrgs.map(([org, data]) => ({
        name: `${fund} - ${org}`,
        'סה"כ': data.totalAmount
      }))
    })

    // נתונים לפי מסגרת - עם סינון
    let frameEntries = Object.entries(summaries.byFrame || {})
      .filter(([frame, amount]) => {
        const numAmount = Number(amount)
        return !isNaN(numAmount) && isFinite(numAmount) && numAmount !== 0
      })
    
    // סינון לפי מסגרות נבחרות
    if (selectedFrame && selectedFrame.length > 0) {
      frameEntries = frameEntries.filter(([frame]) => selectedFrame.includes(frame))
    }
    
    const frameData = frameEntries
      .sort((a, b) => b[1] - a[1])
      .map(([frame, amount]) => ({
        name: frame || 'ללא שם',
        value: Math.abs(amount || 0),
        amount: amount || 0
      }))
      .filter(item => item.value > 0)
    
    // נתונים לפי חודש - עם סינון
    let monthEntries = Object.entries(summaries.byMonth || {})
      .filter(([month, amount]) => {
        const numAmount = Number(amount)
        return !isNaN(numAmount) && isFinite(numAmount) && numAmount !== 0
      })
    
    // סינון לפי חודשים נבחרים
    if (selectedMonth && selectedMonth.length > 0) {
      monthEntries = monthEntries.filter(([month]) => selectedMonth.includes(month))
    }
    
    const monthData = monthEntries
      .sort((a, b) => {
        // מיון לפי תאריך (MM/YYYY)
        const [monthA, yearA] = a[0].split('/')
        const [monthB, yearB] = b[0].split('/')
        if (yearA !== yearB) return yearA.localeCompare(yearB)
        return monthA.localeCompare(monthB)
      })
      .map(([month, amount]) => ({
        name: month || 'ללא תאריך',
        value: Math.abs(amount || 0),
        amount: amount || 0
      }))
      .filter(item => item.value > 0)

    return {
      transactionTypeData,
      fundData,
      orgData,
      categoryData,
      fundOrgData,
      frameData,
      monthData
    }
  }, [summaries, selectedFund, selectedTransactionType, selectedCategory, selectedFrame, selectedMonth])

  // רשימת קטגוריות לסינון
  const availableCategories = useMemo(() => {
    if (!summaries) return []
    return Object.keys(summaries.byCategory || {}).sort()
  }, [summaries])

  // רשימת מסגרות לסינון
  const availableFrames = useMemo(() => {
    if (!summaries) return []
    return Object.keys(summaries.byFrame || {}).sort()
  }, [summaries])

  // רשימת חודשים לסינון
  const availableMonths = useMemo(() => {
    if (!summaries) return []
    return Object.keys(summaries.byMonth || {}).sort()
  }, [summaries])

  const overviewCards = useMemo(() => {
    if (!summaries || !chartData) return []
    return [
      {
        title: 'תרומות',
        value: `₪${formatCurrency(Math.abs(summaries.byTransactionType?.donations || 0))}`,
        subtitle: 'תרומות בטווח שנבחר',
        accent: { main: '#1d4ed8', soft: '#dbeafe', border: '#bfdbfe' },
        icon: (
          <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3 1.3 3 3-1.3 3-3 3m0-15c1.4 0 2.7.4 3.8 1M12 8V5m0 14v-3m0 0c-1.4 0-2.7-.4-3.8-1" />
          </svg>
        ),
      },
      {
        title: 'תמיכות',
        value: `₪${formatCurrency(Math.abs(summaries.byTransactionType?.supports || 0))}`,
        subtitle: 'סך התמיכות המוצגות',
        accent: { main: '#7c3aed', soft: '#f3e8ff', border: '#e9d5ff' },
        icon: (
          <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a9.2 9.2 0 002.6.4 9.3 9.3 0 004.1-1 4.1 4.1 0 00-7.5-2.5M15 19v.1A12.3 12.3 0 018.6 21c-2.3 0-4.5-.6-6.4-1.8v-.1a6.4 6.4 0 0112-3M12 6.4A3.4 3.4 0 115.2 6.4a3.4 3.4 0 016.8 0zm8.2 2.2a2.6 2.6 0 11-5.2 0 2.6 2.6 0 015.2 0z" />
          </svg>
        ),
      },
      {
        title: 'תקורות',
        value: `₪${formatCurrency(Math.abs(summaries.byTransactionType?.overheads || 0))}`,
        subtitle: 'סך התקורות לפי O + Q',
        accent: { main: '#dc2626', soft: '#fee2e2', border: '#fecaca' },
        icon: (
          <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m11 0A8 8 0 117 4.6" />
          </svg>
        ),
      },
    ]
  }, [summaries, chartData])

  const rowSections = useMemo(() => {
    if (!chartData || !summaries) return []

    return [
      {
        title: 'סוגי פעולה',
        subtitle: 'פירוט לפי תנועה',
        rows: chartData.transactionTypeData.map((item) => ({ name: item.name, value: item.value })),
        total: summaries.total?.totalAmount || 0,
      },
      {
        title: 'קטגוריות',
        subtitle: 'קטגוריות ממוינות לפי סכום (מהנמוך לגבוה)',
        rows: chartData.categoryData.map((item) => ({ name: item.name, value: item.value })),
        total: Math.abs(summaries.byTransactionType?.supports || 0),
      },
      {
        title: 'קרנות',
        subtitle: 'חלוקה לפי קרן',
        rows: chartData.fundData.map((item) => ({ name: item.name, value: item['סה"כ'] || 0 })),
        total: summaries.total?.totalAmount || 0,
      },
      {
        title: 'ארגונים',
        subtitle: 'פירוט לפי ארגון',
        rows: chartData.orgData.map((item) => ({ name: item.name, value: item['סה"כ'] || 0 })),
        total: summaries.total?.totalAmount || 0,
      },
      {
        title: 'חודשים',
        subtitle: 'פירוט לאורך זמן',
        rows: chartData.monthData.map((item) => ({ name: item.name, value: item.value })),
        total: summaries.total?.totalAmount || 0,
      },
      {
        title: 'קרן וארגון',
        subtitle: 'שילוב קרן וארגון',
        rows: chartData.fundOrgData.map((item) => ({ name: item.name, value: item['סה"כ'] || 0 })),
        total: summaries.total?.totalAmount || 0,
      },
    ].filter((section) => section.rows.length > 0)
  }, [chartData, summaries])

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: 0.75,
          fontWeight: 800,
          color: '#0f172a',
        }}
      >
        סיכומים
      </Typography>
      <Typography sx={{ mb: 4, fontSize: 14, color: '#64748b' }}>
        תצוגת סיכומים מעוצבת עם גרפים או שורות, בהשראת מסך הדשבורד והעלאת הקבצים.
      </Typography>

      {/* סרגל סינון */}
      {!hideFilterUI && (
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, md: 3 },
          mb: 4,
          borderRadius: 5,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              שדות סינון
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
              בחר טווח, קרן וסוגי תנועה כדי לקבל תצוגה מדויקת יותר
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2.2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth sx={filterFieldSx}>
              <InputLabel>טווח תאריכים</InputLabel>
              <Select
                value={dateRange}
                label="טווח תאריכים"
                onChange={(e) => handleDateRangeChange(e.target.value)}
              >
                <MenuItem value="custom">טווח מותאם אישית</MenuItem>
                <MenuItem value="year">מתחילת השנה</MenuItem>
                <MenuItem value="lastMonth">חודש קודם</MenuItem>
                <MenuItem value="thisMonth">חודש זה</MenuItem>
              </Select>
            </FormControl>
          </Grid>

            {dateRange === 'custom' && (
              <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="תאריך התחלה"
                  type="date"
                  value={formatDateInputValue(startDate)}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="תאריך סיום"
                  type="date"
                  value={formatDateInputValue(endDate)}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={filterFieldSx}
                />
              </Grid>
              </>
            )}

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 3}>
            <FormControl fullWidth sx={filterFieldSx}>
              <InputLabel>קרן</InputLabel>
              <Select
                multiple
                value={selectedFund}
                label="קרן"
                onChange={(e) => setSelectedFund(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <span style={{ color: '#94a3b8' }}>ללא סינון</span>
                  }
                  if (selected.length === 1) {
                    const fund = funds.find(f => {
                      const fundValue = typeof f === 'string' ? f : f.value
                      return fundValue === selected[0]
                    })
                    const fundLabel = fund ? (typeof fund === 'string' ? fund : fund.label) : selected[0]
                    return fundLabel
                  }
                  return `${selected.length} קרנות נבחרו`
                }}
              >
                {funds.map((f) => {
                  const fundValue = typeof f === 'string' ? f : f.value
                  const fundLabel = typeof f === 'string' ? f : f.label
                  return (
                    <MenuItem key={fundValue} value={fundValue}>
                      {fundLabel}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 3}>
            <FormControl fullWidth sx={filterFieldSx}>
              <InputLabel>סוג פעולה</InputLabel>
              <Select
                multiple
                value={selectedTransactionType}
                label="סוג פעולה"
                onChange={(e) =>
                  setSelectedTransactionType(
                    typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                  )
                }
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <span style={{ color: '#94a3b8' }}>ללא סינון</span>
                  }
                  if (selected.length === 1) {
                    const type = transactionTypes.find((t) => t.value === selected[0])
                    return type ? type.label : selected[0]
                  }
                  return `${selected.length} סוגים נבחרו`
                }}
              >
                {transactionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 1 : 3}>
            <Button
              variant="contained"
              onClick={handleGenerateSummary}
              disabled={loading}
              fullWidth
              sx={{
                borderRadius: 3.5,
                minHeight: 56,
                background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 12px 24px rgba(20, 184, 166, 0.24)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 16px 28px rgba(15, 118, 110, 0.28)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'הצג סיכומים'}
            </Button>
          </Grid>
        </Grid>

        {/* סינון קטגוריה - רק אחרי טעינת נתונים */}
        {summaries && availableCategories.length > 0 && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {availableCategories.length > 0 && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth sx={filterFieldSx}>
                  <InputLabel>קטגוריה</InputLabel>
                  <Select
                    multiple
                    value={selectedCategory}
                    label="קטגוריה"
                    onChange={(e) => {
                      setSelectedCategory(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                    }}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <span style={{ color: '#94a3b8' }}>ללא סינון</span>
                      }
                      if (selected.length === 1) {
                        return selected[0]
                      }
                      return `${selected.length} קטגוריות נבחרו`
                    }}
                >
                  {availableCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            )}
          </Grid>
        )}
      </Paper>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 4,
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
          }}
        >
          {error}
        </Alert>
      )}

      {/* הודעה כשאין נתונים */}
      {(!summaries || !chartData || 
        (chartData.transactionTypeData.length === 0 && 
         chartData.fundData.length === 0 && 
         chartData.orgData.length === 0 && 
         chartData.categoryData.length === 0 && 
         chartData.fundOrgData.length === 0)) && (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 5,
            border: '1px dashed #cbd5e1',
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontWeight: 700 }}>
            אין נתונים להצגה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            אנא בחר טווח תאריכים ולחץ על "הצג סיכומים" כדי לראות נתונים
          </Typography>
        </Paper>
      )}

      {/* תצוגת סיכומים */}
      {summaries && chartData && (
        <Box>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {overviewCards.map((card) => (
              <Grid item xs={12} sm={6} xl={3} key={card.title}>
                <SummaryMetricCard {...card} />
              </Grid>
            ))}
          </Grid>

          <Paper
            elevation={0}
            sx={{
              mb: 3,
              p: { xs: 2, md: 2.5 },
              borderRadius: 5,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  תצוגת נתונים
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
                  אפשר לעבור בין גרפים ויזואליים לבין תצוגת שורות מפורטת
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <ToggleButtonGroup
                  exclusive
                  value={viewMode}
                  onChange={(_, nextView) => {
                    if (nextView) setViewMode(nextView)
                  }}
                  sx={{
                    '& .MuiToggleButton-root': {
                      border: '1px solid #dbe3ee',
                      color: '#475569',
                      px: 2.5,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: '14px !important',
                    },
                    '& .Mui-selected': {
                      backgroundColor: '#0f766e !important',
                      color: '#ffffff !important',
                      boxShadow: '0 10px 20px rgba(15, 118, 110, 0.2)',
                    },
                  }}
                >
                  <ToggleButton value="charts">גרפים</ToggleButton>
                  <ToggleButton value="rows">שורות</ToggleButton>
                </ToggleButtonGroup>

                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                  sx={{
                    background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '14px',
                    px: 2.5,
                    py: 1,
                    boxShadow: '0 4px 14px rgba(8, 145, 178, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)',
                      boxShadow: '0 6px 20px rgba(8, 145, 178, 0.35)',
                    },
                  }}
                >
                  הורד אקסל
                </Button>
                <Menu
                  anchorEl={downloadMenuAnchor}
                  open={Boolean(downloadMenuAnchor)}
                  onClose={() => setDownloadMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      borderRadius: 3,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                      minWidth: 260,
                      border: '1px solid #e2e8f0',
                    }
                  }}
                  transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                >
                  <MenuItem onClick={handleDownloadSummary} sx={{ py: 1.5 }}>
                    <ListItemIcon><SummarizeIcon sx={{ color: '#0891b2' }} /></ListItemIcon>
                    <ListItemText
                      primary="אקסל סיכום"
                      secondary="סה״כ תרומות, תמיכות, תקורות + קטגוריות"
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12, color: '#64748b' }}
                    />
                  </MenuItem>
                  <MenuItem onClick={handleDownloadFiltered} sx={{ py: 1.5 }}>
                    <ListItemIcon><FilterListIcon sx={{ color: '#7c3aed' }} /></ListItemIcon>
                    <ListItemText
                      primary="אקסל לפי בחירה"
                      secondary="סיכום לפי הפילטרים הנוכחיים שנבחרו"
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12, color: '#64748b' }}
                    />
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleDownloadExpanded} sx={{ py: 1.5 }}>
                    <ListItemIcon><TableChartIcon sx={{ color: '#059669' }} /></ListItemIcon>
                    <ListItemText
                      primary="אקסל מורחב"
                      secondary="כל הפירוטים: סוגי פעולה, קטגוריות, שורות"
                      primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12, color: '#64748b' }}
                    />
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </Paper>

          {viewMode === 'charts' ? (
        <Grid container spacing={3}>
          {/* גרף עוגה - סוג פעולה */}
          {chartData.transactionTypeData.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card 
                elevation={8}
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי סוג פעולה
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(transactionTypeChartRef, 'סוג_פעולה')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={transactionTypeChartRef}>
                    <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={chartData.transactionTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                          const RADIAN = Math.PI / 180
                          // אם החתיכה קטנה מדי (פחות מ-5%), לא מציגים טקסט על העוגה
                          if (percent < 0.05) {
                            return null
                          }
                          
                          // מיקום הטקסט - מחוץ לעוגה לחתיכות קטנות
                          const isSmallSlice = percent < 0.12
                          const labelRadius = isSmallSlice 
                            ? outerRadius + 70
                            : outerRadius + 35
                          const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
                          const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)
                          
                          const formattedValue = formatCurrency(value)
                          const percentValue = (percent * 100).toFixed(1)
                          
                          // נקודת התחלה לקו מוביל (לחתיכות קטנות)
                          const lineX = cx + outerRadius * Math.cos(-midAngle * RADIAN)
                          const lineY = cy + outerRadius * Math.sin(-midAngle * RADIAN)
                          const textAnchor = x > cx ? 'start' : 'end'
                          
                          return (
                            <g>
                              <line
                                x1={lineX}
                                y1={lineY}
                                x2={x}
                                y2={y}
                                stroke="#475569"
                                strokeWidth={2}
                                strokeOpacity={0.7}
                              />
                              <text
                                x={x}
                                y={y}
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                style={{
                                  fill: '#0f172a',
                                  fontSize: isSmallSlice ? '12px' : '13px',
                                  fontWeight: 700,
                                  paintOrder: 'stroke',
                                  stroke: '#ffffff',
                                  strokeWidth: 4,
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                }}
                              >
                                <tspan x={x} dy={isSmallSlice ? "-8" : "-10"} style={{ fontSize: isSmallSlice ? '12px' : '14px', fontWeight: 800 }}>
                                  {name}
                                </tspan>
                                <tspan x={x} dy="15" style={{ fontSize: isSmallSlice ? '11px' : '12px', fontWeight: 700 }}>
                                  {formattedValue} ₪
                                </tspan>
                                <tspan x={x} dy="15" style={{ fontSize: isSmallSlice ? '10px' : '11px' }}>
                                  {percentValue}%
                                </tspan>
                              </text>
                            </g>
                          )
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#0891b2"
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={3}
                      >
                        {chartData.transactionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          `${formatCurrency(value)} ₪`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* גרף עוגה - קטגוריות */}
          {chartData.categoryData.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card 
                elevation={8}
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי קטגוריות
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(categoryChartRef, 'קטגוריות')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={categoryChartRef}>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                      <Pie
                        data={chartData.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                          const RADIAN = Math.PI / 180
                          // אם החתיכה קטנה מדי (פחות מ-5%), לא מציגים טקסט על העוגה
                          if (percent < 0.05) {
                            return null
                          }
                          
                          // מיקום הטקסט - מחוץ לעוגה לחתיכות קטנות
                          const isSmallSlice = percent < 0.12
                          const labelRadius = isSmallSlice 
                            ? outerRadius + 70
                            : outerRadius + 35
                          const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
                          const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)
                          
                          const formattedValue = formatCurrency(value)
                          const percentValue = (percent * 100).toFixed(1)
                          
                          // נקודת התחלה לקו מוביל (לחתיכות קטנות)
                          const lineX = cx + outerRadius * Math.cos(-midAngle * RADIAN)
                          const lineY = cy + outerRadius * Math.sin(-midAngle * RADIAN)
                          const textAnchor = x > cx ? 'start' : 'end'
                          
                          return (
                            <g>
                              <line
                                x1={lineX}
                                y1={lineY}
                                x2={x}
                                y2={y}
                                stroke="#475569"
                                strokeWidth={2}
                                strokeOpacity={0.7}
                              />
                              <text
                                x={x}
                                y={y}
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                style={{
                                  fill: '#0f172a',
                                  fontSize: isSmallSlice ? '12px' : '13px',
                                  fontWeight: 700,
                                  paintOrder: 'stroke',
                                  stroke: '#ffffff',
                                  strokeWidth: 4,
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                }}
                              >
                                <tspan x={x} dy={isSmallSlice ? "-8" : "-10"} style={{ fontSize: isSmallSlice ? '12px' : '14px', fontWeight: 800 }}>
                                  {name}
                                </tspan>
                                <tspan x={x} dy="15" style={{ fontSize: isSmallSlice ? '11px' : '12px', fontWeight: 700 }}>
                                  {formattedValue} ₪
                                </tspan>
                                <tspan x={x} dy="15" style={{ fontSize: isSmallSlice ? '10px' : '11px' }}>
                                  {percentValue}%
                                </tspan>
                              </text>
                            </g>
                          )
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#0891b2"
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={3}
                      >
                        {chartData.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [
                          `${formatCurrency(value)} ₪`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* גרף עמודות - לפי קרן */}
          {chartData.fundData.length > 0 && (
            <Grid item xs={12}>
              <Card 
                elevation={8}
                sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי קרן
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(fundChartRef, 'קרן')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={fundChartRef}>
                    <ResponsiveContainer width="100%" height={450}>
                      <ComposedChart data={chartData.fundData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [`${formatCurrency(value)} ₪`, name]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #d0d0d0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        labelStyle={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                      />
                      <Bar dataKey="תרומות" fill={BAR_COLORS['תרומות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="מלגות" fill={BAR_COLORS['מלגות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="תקורות" fill={BAR_COLORS['תקורות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="תמיכות" fill={BAR_COLORS['תמיכות']} radius={[8, 8, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* גרף עמודות - לפי ארגון */}
          {chartData.orgData.length > 0 && (
            <Grid item xs={12}>
              <Card 
                elevation={8}
                sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי ארגון
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(orgChartRef, 'ארגון')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={orgChartRef}>
                    <ResponsiveContainer width="100%" height={450}>
                      <ComposedChart data={chartData.orgData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => [`${formatCurrency(value)} ₪`, name]}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #d0d0d0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        labelStyle={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>}
                      />
                      <Bar dataKey="תרומות" fill={BAR_COLORS['תרומות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="מלגות" fill={BAR_COLORS['מלגות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="תקורות" fill={BAR_COLORS['תקורות']} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="תמיכות" fill={BAR_COLORS['תמיכות']} radius={[8, 8, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* גרף קו - סכום כולל לפי קרן וארגון */}
          {chartData.fundOrgData.length > 0 && (
            <Grid item xs={12}>
              <Card
                elevation={8}
                sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי קרן וארגון
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(fundOrgChartRef, 'קרן_וארגון')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={fundOrgChartRef}>
                    <ResponsiveContainer width="100%" height={450}>
                      <AreaChart data={chartData.fundOrgData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        tick={{ fontSize: 11, fill: '#666', fontWeight: 600 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <RechartsTooltip 
                        formatter={(value) => `${formatCurrency(value)} ₪`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #d0d0d0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        labelStyle={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={'סה"כ'} 
                        stroke="#0891b2" 
                        strokeWidth={3}
                        fill="url(#colorTotal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* גרף עמודות - לפי חודשים */}
          {chartData.monthData && chartData.monthData.length > 0 && (
            <Grid item xs={12}>
              <Card 
                elevation={8}
                sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2' }}>
                      סיכום לפי חודשים
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(monthChartRef, 'חודשים')}
                        size="small"
                        sx={{
                          color: '#0891b2',
                          '&:hover': {
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={monthChartRef}>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData.monthData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" opacity={0.5} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#666', fontWeight: 600 }}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <RechartsTooltip 
                          formatter={(value) => `${formatCurrency(value)} ₪`}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: '1px solid #d0d0d0',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                          labelStyle={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          fill="#0891b2" 
                          radius={[8, 8, 0, 0]}
                          stroke="#0891b2"
                          strokeWidth={2}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
          ) : (
            <Grid container spacing={3}>
              {rowSections.map((section) => (
                <Grid item xs={12} md={6} key={section.title}>
                  <DataRowsCard
                    title={section.title}
                    subtitle={section.subtitle}
                    rows={section.rows}
                    total={section.total}
                    formatCurrency={formatCurrency}
                    onDownloadDetail={handleDownloadDetailRows}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      <ConflictResolutionModal
        open={conflictModalOpen}
        conflict={currentConflict}
        onResolve={handleConflictResolve}
        onCancel={() => setConflictModalOpen(false)}
      />
    </Box>
  )
}

export default SummariesPage

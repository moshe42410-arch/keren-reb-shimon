import React, { useState, useEffect, useMemo, useRef } from 'react'
import { getAllFundsWithLabels } from '../services/storageService'
import { summarizeByFundAndOrganization } from '../services/summaryService'
import { useData } from '../context/DataContext'
import { loadMaorotData } from '../services/maorotStorage'
import ConflictResolutionModal from '../components/ConflictResolutionModal'
import {
  buildSupportIdentifiers,
  findColumnIndex,
  formatDateDisplay,
  normalizeIdentifier,
  parseAmount,
  normalizeString,
} from '../utils/maorotUtils'
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
import html2canvas from 'html2canvas'
import DownloadIcon from '@mui/icons-material/Download'
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
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'

// צבעים יוקרתיים - עיצוב בנקאי
const COLORS = [
  '#1e3a8a', // כחול כהה יוקרתי
  '#059669', // ירוק כהה
  '#dc2626', // אדום כהה
  '#7c3aed', // סגול
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
  'תמיכות': '#7c3aed'
}

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
    { value: 'supports', label: 'תמיכות' }
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
      // שימוש בנתונים מלוח תנועות (returnFileRows)
      const returnFileRows = maorotData.returnFileRows || []
      const supports = maorotData.supports || []
      const supportsHeaders = maorotData.supportsHeaders || []
      
      // יצירת סיכום מלוח תנועות
      const summary = generateSummaryFromMovements(returnFileRows, supports, supportsHeaders, startDate, endDate, selectedCategory, selectedFrame, selectedMonth)
      
      setSummaries(summary)
    } catch (err) {
      setError(`שגיאה ביצירת סיכום: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // פונקציה ליצירת סיכום מלוח תנועות
  const generateSummaryFromMovements = (returnFileRows, supports, supportsHeaders, startDate, endDate, selectedCategory = [], selectedFrame = [], selectedMonth = []) => {
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
        supports: 0
      },
      byCategory: {},
      byFrame: {},
      byMonth: {},
      total: {
        donations: 0,
        scholarships: 0,
        overheads: 0,
        supports: 0,
        supportsByCategory: {},
        totalAmount: 0
      },
      conflicts: []
    }
    
    returnFileRows.forEach((row) => {
      // סינון לפי תאריך
      // מטפל בתאריך בפורמט DD/MM/YYYY או Date object
      let rowDate = null
      if (row.date) {
        if (row.date instanceof Date) {
          rowDate = row.date
        } else if (typeof row.date === 'string') {
          // מנסה לפרסר תאריך בפורמט DD/MM/YYYY
          const dateParts = row.date.split('/')
          if (dateParts.length === 3) {
            const [day, month, year] = dateParts
            rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            rowDate = new Date(row.date)
          }
        }
      }
      
      if (rowDate && !isNaN(rowDate.getTime()) && (rowDate < startDate || rowDate > endDate)) {
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
      
      const amount = parseAmount(row.amount)
      if (amount <= 0) return
      
      const categoryValue = supportMatch && Number.isInteger(categoryIndex) && Array.isArray(supportMatch.rawRow)
        ? normalizeString(supportMatch.rawRow[categoryIndex]) || 'לא סווג'
        : 'לא סווג'
      
      const frameValue = supportMatch && Number.isInteger(frameIndex) && Array.isArray(supportMatch.rawRow)
        ? normalizeString(supportMatch.rawRow[frameIndex]) || 'לא סווג'
        : 'לא סווג'
      
      // חילוץ חודש מתאריך - פורמט MM/YYYY
      let monthKey = 'ללא תאריך'
      if (rowDate && !isNaN(rowDate.getTime())) {
        const month = String(rowDate.getMonth() + 1).padStart(2, '0')
        const year = rowDate.getFullYear()
        monthKey = `${month}/${year}`
      } else if (row.date) {
        // אם התאריך הוא מחרוזת בפורמט DD/MM/YYYY, נחלץ את החודש
        const dateStr = String(row.date)
        const dateParts = dateStr.split('/')
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts
          monthKey = `${month}/${year}`
        }
      }
      
      // סינון לפי קטגוריה, מסגרת וחודש
      if (selectedCategory.length > 0 && !selectedCategory.includes(categoryValue)) {
        return
      }
      if (selectedFrame.length > 0 && !selectedFrame.includes(frameValue)) {
        return
      }
      if (selectedMonth.length > 0 && !selectedMonth.includes(monthKey)) {
        return
      }
      
      // עדכון סיכומים
      if (!summary.byCategory[categoryValue]) summary.byCategory[categoryValue] = 0
      summary.byCategory[categoryValue] += amount
      
      if (!summary.byFrame[frameValue]) summary.byFrame[frameValue] = 0
      summary.byFrame[frameValue] += amount
      
      if (!summary.byMonth[monthKey]) summary.byMonth[monthKey] = 0
      summary.byMonth[monthKey] += amount
      
      // תמיכות בלבד (כי זה מלוח תנועות)
      summary.byTransactionType.supports += amount
      summary.total.supports += amount
      summary.total.totalAmount += amount
      
      if (!summary.total.supportsByCategory[categoryValue]) {
        summary.total.supportsByCategory[categoryValue] = 0
      }
      summary.total.supportsByCategory[categoryValue] += amount
    })
    
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

  // Refs לכל גרף להורדה - רק את ה-ResponsiveContainer (הגרף עצמו)
  const transactionTypeChartRef = useRef(null)
  const categoryChartRef = useRef(null)
  const fundChartRef = useRef(null)
  const orgChartRef = useRef(null)
  const fundOrgChartRef = useRef(null)

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

  // הכנת נתונים לגרפים עם סינון
  const chartData = useMemo(() => {
    if (!summaries) return null

    // סינון לפי סוג פעולה
    let filteredTransactionTypes = {
      donations: summaries.byTransactionType.donations,
      scholarships: summaries.byTransactionType.scholarships,
      overheads: summaries.byTransactionType.overheads,
      supports: summaries.byTransactionType.supports,
    }

    if (selectedTransactionType && selectedTransactionType.length > 0) {
      // אם נבחר סוג פעולה ספציפי, נציג רק אותו
      const typeMap = {
        'donations': 'donations',
        'scholarships': 'scholarships',
        'overheads': 'overheads',
        'supports': 'supports'
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
          'supports': 'supports'
        }
        const selectedTypes = selectedTransactionType
          .map((type) => typeMap[type])
          .filter(Boolean)
        filteredData = {
          donations: selectedTypes.includes('donations') ? data.donations : 0,
          scholarships: selectedTypes.includes('scholarships') ? data.scholarships : 0,
          overheads: selectedTypes.includes('overheads') ? data.overheads : 0,
          supports: selectedTypes.includes('supports') ? data.supports : 0,
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
          'supports': 'supports'
        }
        const selectedTypes = selectedTransactionType
          .map((type) => typeMap[type])
          .filter(Boolean)
        filteredData = {
          donations: selectedTypes.includes('donations') ? data.donations : 0,
          scholarships: selectedTypes.includes('scholarships') ? data.scholarships : 0,
          overheads: selectedTypes.includes('overheads') ? data.overheads : 0,
          supports: selectedTypes.includes('supports') ? data.supports : 0,
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
      .sort((a, b) => b[1] - a[1])
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
    return Object.keys(summaries.byCategory).sort()
  }, [summaries])

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)', minHeight: '100vh' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: 4, 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        סיכומים ומצגות נתונים
      </Typography>

      {/* סרגל סינון */}
      {!hideFilterUI && (
      <Paper 
        elevation={8} 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>טווח תאריכים</InputLabel>
              <Select
                value={dateRange}
                label="טווח תאריכים"
                onChange={(e) => handleDateRangeChange(e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
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
                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'white',
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="תאריך סיום"
                    type="date"
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'white',
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                />
              </Grid>
              </>
            )}

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 3}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>קרן</InputLabel>
              <Select
                multiple
                value={selectedFund}
                label="קרן"
                onChange={(e) => setSelectedFund(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>ללא סינון</span>
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
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
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
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>סוג פעולה</InputLabel>
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
                    return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>ללא סינון</span>
                  }
                  if (selected.length === 1) {
                    const type = transactionTypes.find((t) => t.value === selected[0])
                    return type ? type.label : selected[0]
                  }
                  return `${selected.length} סוגים נבחרו`
                }}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
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
                background: 'white',
                color: '#667eea',
                fontWeight: 700,
                py: 1.5,
                fontSize: '1rem',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'הצג סיכומים'}
            </Button>
          </Grid>
        </Grid>

        {/* סינון קטגוריה / מסגרת / חודש - רק אחרי טעינת נתונים */}
        {summaries && (availableCategories.length > 0 || availableFrames.length > 0 || availableMonths.length > 0) && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {availableCategories.length > 0 && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'white' }}>קטגוריה</InputLabel>
                    <Select
                    multiple
                    value={selectedCategory}
                    label="קטגוריה"
                    onChange={(e) => {
                      setSelectedCategory(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                    }}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>ללא סינון</span>
                      }
                      if (selected.length === 1) {
                        return selected[0]
                      }
                      return `${selected.length} קטגוריות נבחרו`
                    }}
                    sx={{
                      color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.8)',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
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
            
            {availableFrames.length > 0 && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'white' }}>מסגרת</InputLabel>
                  <Select
                    multiple
                    value={selectedFrame}
                    label="מסגרת"
                    onChange={(e) => {
                      setSelectedFrame(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                    }}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>ללא סינון</span>
                      }
                      if (selected.length === 1) {
                        return selected[0]
                      }
                      return `${selected.length} מסגרות נבחרו`
                    }}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                    }}
                  >
                    {availableFrames.map((frame) => (
                      <MenuItem key={frame} value={frame}>
                        {frame}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            {availableMonths.length > 0 && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'white' }}>חודש</InputLabel>
                  <Select
                    multiple
                    value={selectedMonth}
                    label="חודש"
                    onChange={(e) => {
                      setSelectedMonth(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
                    }}
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>ללא סינון</span>
                      }
                      if (selected.length === 1) {
                        return selected[0]
                      }
                      return `${selected.length} חודשים נבחרו`
                    }}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.8)',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                    }}
                  >
                    {availableMonths.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
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
        <Alert severity="error" sx={{ mb: 3 }}>
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
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            אין נתונים להצגה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            אנא בחר טווח תאריכים ולחץ על "הצג סיכומים" כדי לראות נתונים
          </Typography>
        </Paper>
      )}

      {/* גרפים */}
      {summaries && chartData && (
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי סוג פעולה
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(transactionTypeChartRef, 'סוג_פעולה')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                        fill="#8884d8"
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי קטגוריות
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(categoryChartRef, 'קטגוריות')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                        fill="#8884d8"
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי קרן
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(fundChartRef, 'קרן')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי ארגון
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(orgChartRef, 'ארגון')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי קרן וארגון
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(fundOrgChartRef, 'קרן_וארגון')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
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
                        stroke="#667eea" 
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

          {/* גרף עוגה - מסגרות */}
          {chartData.frameData && chartData.frameData.length > 0 && (
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי מסגרות
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(frameChartRef, 'מסגרות')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box ref={frameChartRef}>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={chartData.frameData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                            const RADIAN = Math.PI / 180
                            if (percent < 0.05) return null
                            const isSmallSlice = percent < 0.12
                            const labelRadius = isSmallSlice ? outerRadius + 70 : outerRadius + 35
                            const x = cx + labelRadius * Math.cos(-midAngle * RADIAN)
                            const y = cy + labelRadius * Math.sin(-midAngle * RADIAN)
                            const formattedValue = formatCurrency(value)
                            const percentValue = (percent * 100).toFixed(1)
                            const lineX = cx + outerRadius * Math.cos(-midAngle * RADIAN)
                            const lineY = cy + outerRadius * Math.sin(-midAngle * RADIAN)
                            const textAnchor = x > cx ? 'start' : 'end'
                            return (
                              <g>
                                <line x1={lineX} y1={lineY} x2={x} y2={y} stroke="#475569" strokeWidth={2} strokeOpacity={0.7} />
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
                          fill="#8884d8"
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={3}
                        >
                          {chartData.frameData.map((entry, index) => (
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
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                      סיכום לפי חודשים
                    </Typography>
                    <Tooltip title="הורד כתמונה">
                      <IconButton
                        onClick={() => downloadChartAsImage(monthChartRef, 'חודשים')}
                        size="small"
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
                          fill="#667eea" 
                          radius={[8, 8, 0, 0]}
                          stroke="#667eea"
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

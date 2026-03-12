import React, { useState, useEffect } from 'react'
import { getDataByDateRange, getAllFundsWithLabels } from '../services/storageService'
import { useData } from '../context/DataContext'
import { exportToExcel } from '../services/exportUtils'
import { fetchAllCategoriesData } from '../services/googleSheets'
import { findAllMatchingCategories, isDonation, isScholarship, isOverhead, isSupport } from '../services/summaryService'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'

const InsightCard = ({ title, value, subtitle, accent, icon }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      borderRadius: 5,
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent.main,
          backgroundColor: accent.soft,
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
        תצוגה
      </Box>
    </Box>
    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#334155', mb: 0.5 }}>
      {title}
    </Typography>
    <Typography sx={{ fontSize: 12, color: '#64748b' }}>
      {subtitle}
    </Typography>
  </Paper>
)

const ReportsPage = () => {
  const { googleSheetsId } = useData()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedFund, setSelectedFund] = useState('')
  const [selectedTransactionType, setSelectedTransactionType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [funds, setFunds] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [error, setError] = useState('')
  const [reportName, setReportName] = useState('')

  const fieldSx = {
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

  const transactionTypes = [
    { value: '', label: 'כל הפעולות' },
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
    
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setEndDate(now)
    
    // האזנה לעדכוני קרנות
    window.addEventListener('fundsUpdated', loadFunds)
    
    return () => {
      window.removeEventListener('fundsUpdated', loadFunds)
    }
  }, [])

  // טעינת קטגוריות זמינות
  useEffect(() => {
    const loadCategories = async () => {
      if (googleSheetsId && startDate && endDate) {
        try {
          const data = getDataByDateRange(selectedFund || null, startDate, endDate)
          if (data.length > 0) {
            const categoriesData = await fetchAllCategoriesData(googleSheetsId)
            const categorySet = new Set()
            
            // איסוף קטגוריות מכל הנתונים
            for (const item of data) {
              const processedData = item.data?.processedData
              if (processedData && processedData.rows) {
                for (const row of processedData.rows) {
                  if (isSupport(row.type) && row.idNumber) {
                    const matches = findAllMatchingCategories(
                      categoriesData,
                      row.idNumber,
                      row.date,
                      row.amount
                    )
                    matches.forEach(m => categorySet.add(m.category))
                  }
                }
              }
            }
            
            setAvailableCategories(Array.from(categorySet).sort())
          }
        } catch (err) {
          console.warn('שגיאה בטעינת קטגוריות:', err)
        }
      }
    }
    
    loadCategories()
  }, [googleSheetsId, selectedFund, startDate, endDate])

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

  const formatDate = (dateValue) => {
    if (!dateValue) return ''
    
    try {
      // אם זה מספר (Excel date), ממיר אותו
      if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1899, 11, 30)
        const date = new Date(excelEpoch.getTime() + dateValue * 86400000)
        return date.toLocaleDateString('he-IL')
      }
      
      // אם זה מחרוזת, מנסה לפרסר
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('he-IL')
      }
      
      return String(dateValue)
    } catch {
      return String(dateValue)
    }
  }

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError('אנא בחר טווח תאריכים')
      return
    }

    setError('')
    
    try {
      // איסוף כל הנתונים לפי הסינונים
      const dataItems = getDataByDateRange(selectedFund || null, startDate, endDate)
      
      if (dataItems.length === 0) {
        setError('לא נמצאו נתונים בטווח התאריכים')
      return
    }

      // טעינת קטגוריות מ-Google Sheets
      let categoriesData = null
      if (googleSheetsId) {
        try {
          categoriesData = await fetchAllCategoriesData(googleSheetsId)
        } catch (err) {
          console.warn('שגיאה בטעינת קטגוריות:', err)
        }
      }

      // בניית רשימת שורות לדוח
      const reportRows = []
      
      for (const item of dataItems) {
        const processedData = item.data?.processedData
        const fundKey = item.fund
        const organization = item.data?.organization || 'מרכז הצדקה'
        
        if (!processedData || !processedData.rows) continue
        
        for (const row of processedData.rows) {
          // סינון לפי סוג פעולה
          if (selectedTransactionType) {
            const typeMap = {
              'donations': isDonation,
              'scholarships': isScholarship,
              'overheads': isOverhead,
              'supports': isSupport
            }
            const checkFunction = typeMap[selectedTransactionType]
            if (!checkFunction || !checkFunction(row.type)) {
              continue
            }
          }
          
          // קבלת קטגוריה (רק לתמיכות)
          let category = ''
          if (isSupport(row.type) && row.idNumber && categoriesData) {
            const matches = findAllMatchingCategories(
              categoriesData,
              row.idNumber,
              row.date,
              row.amount
            )
            if (matches.length > 0) {
              category = matches[0].category
            }
          }
          
          // סינון לפי קטגוריה (רק אם יש קטגוריה)
          if (selectedCategory && category !== selectedCategory) {
            continue
          }
          
          // הוספת שורה לדוח
          reportRows.push({
            'תאריך': formatDate(row.date),
            'שם': '', // שם לא זמין בנתונים הנוכחיים
            'מספר זהות': row.idNumber || '',
            'סוג פעולה': row.type || '',
            'סכום': row.amount || 0,
            'קרן': fundKey || '',
            'ארגון': organization || '',
            'קטגוריה': category || ''
          })
        }
      }
      
      if (reportRows.length === 0) {
        setError('לא נמצאו נתונים התואמים לסינונים שנבחרו')
      return
    }

      // יצירת שם קובץ
      const dateStr = new Date().toISOString().split('T')[0]
      let fileName = ''
      
      if (reportName && reportName.trim()) {
        // אם יש שם לדוח, משתמשים בו
        fileName = `${reportName.trim()}_${dateStr}.xlsx`
      } else {
        // אחרת, יוצרים שם אוטומטי
        const fundStr = selectedFund ? `_${selectedFund}` : '_כל_הקרנות'
        const typeStr = selectedTransactionType 
          ? `_${transactionTypes.find(t => t.value === selectedTransactionType)?.label || selectedTransactionType}` 
          : ''
        const categoryStr = selectedCategory ? `_${selectedCategory}` : ''
        fileName = `דוח${fundStr}${typeStr}${categoryStr}_${dateStr}.xlsx`
      }
      
      // יצירת אקסל - משתמש בשם הדוח אם קיים, אחרת 'דוח'
      const sheetName = reportName && reportName.trim() ? reportName.trim() : 'דוח'
      exportToExcel(reportRows, sheetName, fileName)
      
    } catch (err) {
      console.error('Error generating report:', err)
      setError(`שגיאה ביצירת הדוח: ${err.message}`)
    }
  }

  const selectedFundLabel = selectedFund
    ? (() => {
        const fund = funds.find((f) => {
          const value = typeof f === 'string' ? f : f.value
          return value === selectedFund
        })
        return fund ? (typeof fund === 'string' ? fund : fund.label) : selectedFund
      })()
    : 'כל הקרנות'

  const selectedTransactionLabel =
    transactionTypes.find((type) => type.value === selectedTransactionType)?.label || 'כל הפעולות'

  const formatDateInputValue = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toISOString().split('T')[0]
  }

  const activeDateRangeLabel = startDate && endDate
    && startDate instanceof Date && !Number.isNaN(startDate.getTime())
    && endDate instanceof Date && !Number.isNaN(endDate.getTime())
    ? `${startDate.toLocaleDateString('he-IL')} - ${endDate.toLocaleDateString('he-IL')}`
    : 'לא נבחר'

  const reportConfigured = Boolean(startDate && endDate)

  const insightCards = [
    {
      title: 'טווח פעיל',
      value: activeDateRangeLabel,
      subtitle: 'הטווח שבו ייאספו השורות לדוח',
      accent: { main: '#0f766e', soft: '#ccfbf1', border: '#99f6e4' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3.75M16 7v-3.25M3.75 8.75h16.5M5.25 5.75h13.5A1.5 1.5 0 0120.25 7.25v11.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V7.25a1.5 1.5 0 011.5-1.5z" />
        </svg>
      ),
    },
    {
      title: 'קרן נבחרת',
      value: selectedFundLabel,
      subtitle: 'הדוח יכלול את הקרן/ות שבחרת',
      accent: { main: '#1d4ed8', soft: '#dbeafe', border: '#bfdbfe' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3 1.3 3 3-1.3 3-3 3m0-15c1.4 0 2.7.4 3.8 1M12 8V5m0 14v-3m0 0c-1.4 0-2.7-.4-3.8-1" />
        </svg>
      ),
    },
    {
      title: 'סוג פעולה',
      value: selectedTransactionLabel,
      subtitle: 'הסינון שיחול על הנתונים לפני הייצוא',
      accent: { main: '#7c3aed', soft: '#f3e8ff', border: '#e9d5ff' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75h18M7.5 12h9M10.5 17.25h3" />
        </svg>
      ),
    },
    {
      title: 'קטגוריות זמינות',
      value: `${availableCategories.length}`,
      subtitle: availableCategories.length > 0 ? 'קטגוריות זמינות לסינון בדוח' : 'יטען לאחר בחירת נתונים',
      accent: { main: '#d97706', soft: '#fef3c7', border: '#fde68a' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.8 8.6l7.5-4.3a1.5 1.5 0 011.4 0l7.5 4.3a1.5 1.5 0 010 2.6l-7.5 4.3a1.5 1.5 0 01-1.4 0l-7.5-4.3a1.5 1.5 0 010-2.6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.8 13.4l7.5 4.3a1.5 1.5 0 001.4 0l7.5-4.3" />
        </svg>
      ),
    },
  ]

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
        דוחות
      </Typography>
      <Typography sx={{ mb: 4, fontSize: 14, color: '#64748b' }}>
        יצירת דוחות Excel בנראות חדשה, ברורה ואחידה עם שאר המסכים במערכת.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {insightCards.map((card) => (
          <Grid item xs={12} sm={6} xl={3} key={card.title}>
            <InsightCard {...card} />
          </Grid>
        ))}
      </Grid>


      {/* סרגל סינון */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, md: 3 },
          mb: 4,
          borderRadius: 5,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              שדות דוח
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
              הגדר את הפרמטרים, תן שם לדוח אם צריך, ולאחר מכן הורד Excel
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ייצוא מותאם אישית
          </Box>
        </Box>

        <Grid container spacing={2.2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>טווח תאריכים</InputLabel>
              <Select
                value={dateRange}
                label="טווח תאריכים"
                onChange={(e) => handleDateRangeChange(e.target.value)}
              >
                <MenuItem value="custom">טווח מותאם</MenuItem>
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
                  sx={fieldSx}
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
                  sx={fieldSx}
                />
              </Grid>
              </>
            )}

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>קרן</InputLabel>
              <Select
                value={selectedFund}
                label="קרן"
                onChange={(e) => setSelectedFund(e.target.value)}
              >
                <MenuItem value="">כל הקרנות</MenuItem>
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

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>סוג פעולה</InputLabel>
              <Select
                value={selectedTransactionType}
                label="סוג פעולה"
                onChange={(e) => setSelectedTransactionType(e.target.value)}
              >
                {transactionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>קטגוריה</InputLabel>
              <Select
                value={selectedCategory}
                label="קטגוריה"
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={availableCategories.length === 0}
              >
                <MenuItem value="">כל הקטגוריות</MenuItem>
                {availableCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 2}>
            <TextField
              label="שם הדוח (אופציונלי)"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="לדוגמה: דוח חודשי"
              fullWidth
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 3}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleDownload}
                fullWidth
                disabled={false}
                sx={{
                  flex: 1,
                  minWidth: 170,
                  minHeight: 56,
                  borderRadius: 3.5,
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  boxShadow: '0 12px 24px rgba(20, 184, 166, 0.24)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 16px 28px rgba(15, 118, 110, 0.28)',
                  },
                }}
              >
                הורד Excel
              </Button>
              <Button
                variant="outlined"
                onClick={handleDownload}
                sx={{
                  minWidth: 150,
                  minHeight: 56,
                  borderRadius: 3.5,
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  '&:hover': {
                    borderColor: '#94a3b8',
                    backgroundColor: '#f8fafc',
                  },
                }}
              >
                יצא לפי הסינון
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

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

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 5,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
              height: '100%',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
              פורמט הדוח
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2.5 }}>
              קובץ ה־Excel ייוצר עם מבנה קבוע וברור, כדי שיהיה נוח לעבוד איתו גם בתוך המערכת וגם מחוצה לה.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {[
                ['תאריך', 'תאריך התנועה'],
                ['מספר זהות', 'מספר זהות של מקבל התמיכה או התרומה'],
                ['סוג פעולה', 'תרומות, מלגות, תקורות או תמיכות'],
                ['סכום', 'סכום התנועה בפועל'],
                ['קרן', 'שם הקרן המשויכת לשורה'],
                ['ארגון', 'הארגון המשויך לנתונים'],
                ['קטגוריה', 'קטגוריית תמיכה אם קיימת'],
              ].map(([label, desc]) => (
                <Box
                  key={label}
                  sx={{
                    p: 1.75,
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                    {desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 5,
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
              height: '100%',
            }}
          >
            {!error ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 2.5,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    מצב דוח
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                    לאחר בחירת הסינונים אפשר להוריד את הקובץ ישירות ב־Excel.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    background: reportConfigured
                      ? 'linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%)'
                      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: reportConfigured ? '1px solid #99f6e4' : '1px solid #e2e8f0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: reportConfigured ? '#ccfbf1' : '#e2e8f0',
                        color: reportConfigured ? '#0f766e' : '#64748b',
                      }}
                    >
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6.69a1.5 1.5 0 011.06.44l3.06 3.06a1.5 1.5 0 01.44 1.06v10.44a1.5 1.5 0 01-1.5 1.5H7.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6-6h3" />
                      </svg>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        {reportConfigured ? 'הדוח מוכן להגדרה' : 'מוכן להגדרה'}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                        {reportConfigured
                          ? 'הסינונים הוגדרו ואפשר לייצא את הנתונים לקובץ Excel'
                          : 'בחר סינונים והורד קובץ מעוצב ל־Excel'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  onClick={handleDownload}
                  sx={{
                    minHeight: 54,
                    borderRadius: 3.5,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    fontWeight: 700,
                    boxShadow: '0 12px 24px rgba(37, 99, 235, 0.22)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    },
                  }}
                >
                  הורד את הקובץ עכשיו
                </Button>
              </Box>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ReportsPage

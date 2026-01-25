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
        דוחות והורדות
      </Typography>


      {/* סרגל סינון */}
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
          <Grid item xs={12} sm={6} md={2}>
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
                      '& .MuiInputBase-input': {
                        color: 'white',
                      },
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
                      '& .MuiInputBase-input': {
                        color: 'white',
                      },
                    },
                  }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>קרן</InputLabel>
              <Select
                value={selectedFund}
                label="קרן"
                onChange={(e) => setSelectedFund(e.target.value)}
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
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>סוג פעולה</InputLabel>
              <Select
                value={selectedTransactionType}
                label="סוג פעולה"
                onChange={(e) => setSelectedTransactionType(e.target.value)}
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

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>קטגוריה</InputLabel>
              <Select
                value={selectedCategory}
                label="קטגוריה"
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={availableCategories.length === 0}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'white',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: 'white',
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={dateRange === 'custom' ? 2 : 3}>
            <Button
              variant="contained"
              onClick={handleDownload}
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
              הורד Excel
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          פורמט הדוח
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          הדוח יכלול את העמודות הבאות:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 0 }}>
          <li><strong>תאריך</strong> - תאריך התנועה</li>
          <li><strong>מספר זהות</strong> - מספר זהות של מקבל התמיכה/תרומה</li>
          <li><strong>סוג פעולה</strong> - תרומות/מלגות/תקורות/תמיכות</li>
          <li><strong>סכום</strong> - סכום התנועה</li>
          <li><strong>קרן</strong> - שם הקרן</li>
          <li><strong>ארגון</strong> - הארגון (מרכז הצדקה/מאורות)</li>
          <li><strong>קטגוריה</strong> - קטגוריית התמיכה (אם רלוונטי)</li>
        </Box>
      </Paper>
    </Box>
  )
}

export default ReportsPage

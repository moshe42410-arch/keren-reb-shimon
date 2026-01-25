import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import DownloadIcon from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { getAllFundsWithLabels } from '../../services/storageService'
import { summarizeByFundAndOrganization } from '../../services/summaryService'
import { exportToExcel } from '../../services/exportUtils'
import { useData } from '../../context/DataContext'
import ConflictResolutionModal from '../ConflictResolutionModal'

const ReportsTab = () => {
  const { googleSheetsId } = useData()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedFund, setSelectedFund] = useState('')
  const [reportType, setReportType] = useState('summary')
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summaries, setSummaries] = useState(null)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [currentConflict, setCurrentConflict] = useState(null)
  const [conflictResolutions, setConflictResolutions] = useState({})

  useEffect(() => {
    const existingFunds = getAllFundsWithLabels()
    setFunds(existingFunds)
    
    // ברירת מחדל: חודש זה
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setEndDate(now)
  }, [])

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

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('אנא בחר טווח תאריכים')
      return
    }

    setLoading(true)
    setError(null)
    setSummaries(null)

    try {
      const summary = await summarizeByFundAndOrganization(
        selectedFund || null,
        startDate,
        endDate,
        googleSheetsId
      )
      
      setSummaries(summary)
      
      // אם יש קונפליקטים, מציג אותם אחד אחד
      if (summary.conflicts && summary.conflicts.length > 0) {
        handleConflicts(summary.conflicts)
      }
    } catch (err) {
      setError(`שגיאה ביצירת דוח: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConflicts = (conflicts) => {
    if (conflicts.length > 0) {
      setCurrentConflict(conflicts[0])
      setConflictModalOpen(true)
    }
  }

  const handleConflictResolve = (conflict, selectedCategory) => {
    const conflictKey = `${conflict.idNumber}_${conflict.date}_${conflict.amount}`
    setConflictResolutions({
      ...conflictResolutions,
      [conflictKey]: selectedCategory
    })
    
    setConflictModalOpen(false)
    
    if (summaries && summaries.conflicts) {
      const resolvedKeys = Object.keys(conflictResolutions)
      const nextConflict = summaries.conflicts.find(c => {
        const key = `${c.idNumber}_${c.date}_${c.amount}`
        return !resolvedKeys.includes(key) && key !== conflictKey
      })
      
      if (nextConflict) {
        setCurrentConflict(nextConflict)
        setConflictModalOpen(true)
      }
    }
  }

  const handleDownload = () => {
    if (!summaries) {
      setError('אנא צור דוח תחילה')
      return
    }

    try {
      let data = []
      let filename = ''

      switch (reportType) {
        case 'summary':
          // דוח סיכום כללי
          data = [
            { 'סוג': 'תרומות', 'סכום': summaries.total.donations },
            { 'סוג': 'מלגות', 'סכום': summaries.total.scholarships },
            { 'סוג': 'תקורות', 'סכום': summaries.total.overheads },
            { 'סוג': 'תמיכות', 'סכום': summaries.total.supports },
            { 'סוג': 'סה"כ כללי', 'סכום': summaries.total.totalAmount },
          ]
          filename = `דוח_סיכום_${selectedFund || 'כל_הקרנות'}_${new Date().toISOString().split('T')[0]}.xlsx`
          break

        case 'supportsByCategory':
          // תמיכות לפי קטגוריות
          data = Object.entries(summaries.total.supportsByCategory).map(([category, amount]) => ({
            'קטגוריה': category,
            'סכום': amount
          }))
          filename = `דוח_תמיכות_לפי_קטגוריות_${selectedFund || 'כל_הקרנות'}_${new Date().toISOString().split('T')[0]}.xlsx`
          break

        case 'byOrganization':
          // דוח לפי ארגון
          data = []
          Object.entries(summaries.byOrganization).forEach(([org, orgData]) => {
            if (orgData.totalAmount > 0) {
              data.push({ 'ארגון': org, 'סוג': 'תרומות', 'סכום': orgData.donations })
              data.push({ 'ארגון': org, 'סוג': 'מלגות', 'סכום': orgData.scholarships })
              data.push({ 'ארגון': org, 'סוג': 'תקורות', 'סכום': orgData.overheads })
              data.push({ 'ארגון': org, 'סוג': 'תמיכות', 'סכום': orgData.supports })
              data.push({ 'ארגון': org, 'סוג': 'סה"כ', 'סכום': orgData.totalAmount })
            }
          })
          filename = `דוח_לפי_ארגון_${selectedFund || 'כל_הקרנות'}_${new Date().toISOString().split('T')[0]}.xlsx`
          break

        default:
          data = []
      }

      if (data.length > 0) {
        exportToExcel(data, 'דוח', filename)
      } else {
        setError('אין נתונים לייצוא')
      }
    } catch (err) {
      setError(`שגיאה בייצוא הדוח: ${err.message}`)
      console.error(err)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#2e7d32' }}>
        דוחות והורדות
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3, background: '#f9fff9' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>טווח תאריכים</InputLabel>
            <Select
              value={dateRange}
              label="טווח תאריכים"
              onChange={(e) => handleDateRangeChange(e.target.value)}
            >
              <MenuItem value="custom">טווח לפי בחירת הלקוח</MenuItem>
              <MenuItem value="year">מתחילת השנה</MenuItem>
              <MenuItem value="lastMonth">חודש קודם</MenuItem>
              <MenuItem value="thisMonth">חודש זה</MenuItem>
            </Select>
          </FormControl>

          {dateRange === 'custom' && (
            <>
              <TextField
                label="תאריך התחלה"
                type="date"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="תאריך סיום"
                type="date"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
            </>
          )}

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>סוג דוח</InputLabel>
            <Select
              value={reportType}
              label="סוג דוח"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="summary">סיכום כללי</MenuItem>
              <MenuItem value="supportsByCategory">תמיכות לפי קטגוריות</MenuItem>
              <MenuItem value="byOrganization">לפי ארגון</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>קרן (אופציונלי)</InputLabel>
            <Select
              value={selectedFund}
              label="קרן (אופציונלי)"
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

          <Button
            variant="contained"
            onClick={handleGenerateReport}
            disabled={loading}
            sx={{
              background: '#4caf50',
              '&:hover': {
                background: '#45a049',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'צור דוח'}
          </Button>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!summaries || loading}
            sx={{
              background: '#2196f3',
              '&:hover': {
                background: '#1976d2',
              },
            }}
          >
            הורד Excel
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {summaries && (
        <Paper elevation={3} sx={{ p: 3, background: '#ffffff' }}>
          <Typography variant="h6" gutterBottom>
            תצוגה מקדימה של הדוח
          </Typography>
          <Typography variant="body2" color="text.secondary">
            הדוח מוכן להורדה. לחץ על "הורד Excel" כדי להוריד את הקובץ.
          </Typography>
        </Paper>
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

export default ReportsTab

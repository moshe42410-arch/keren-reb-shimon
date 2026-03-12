import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
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
          data = [
            { 'סוג': 'תרומות', 'סכום': summaries.total?.donations },
            { 'סוג': 'מלגות', 'סכום': summaries.total?.scholarships },
            { 'סוג': 'תקורות', 'סכום': summaries.total?.overheads },
            { 'סוג': 'תמיכות', 'סכום': summaries.total?.supports },
            { 'סוג': 'סה"כ כללי', 'סכום': summaries.total?.totalAmount },
          ]
          filename = `דוח_סיכום_${selectedFund || 'כל_הקרנות'}_${new Date().toISOString().split('T')[0]}.xlsx`
          break
        case 'supportsByCategory':
          data = Object.entries(summaries.total?.supportsByCategory || {}).map(([category, amount]) => ({
            'קטגוריה': category,
            'סכום': amount
          }))
          filename = `דוח_תמיכות_לפי_קטגוריות_${selectedFund || 'כל_הקרנות'}_${new Date().toISOString().split('T')[0]}.xlsx`
          break
        case 'byOrganization':
          data = []
          Object.entries(summaries.byOrganization || {}).forEach(([org, orgData]) => {
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
    <div dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">דוחות והורדות</h2>
        <p className="text-sm text-gray-400">יצירת דוחות וייצוא לקבצי Excel</p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex flex-wrap gap-4 items-end">
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>טווח תאריכים</InputLabel>
            <Select
              value={dateRange}
              label="טווח תאריכים"
              onChange={(e) => handleDateRangeChange(e.target.value)}
              sx={{ borderRadius: '12px', fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
            >
              <MenuItem value="custom">טווח מותאם</MenuItem>
              <MenuItem value="year">מתחילת השנה</MenuItem>
              <MenuItem value="lastMonth">חודש קודם</MenuItem>
              <MenuItem value="thisMonth">חודש זה</MenuItem>
            </Select>
          </FormControl>

          {dateRange === 'custom' && (
            <>
              <TextField
                label="מ-תאריך"
                type="date"
                size="small"
                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="עד-תאריך"
                type="date"
                size="small"
                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>סוג דוח</InputLabel>
            <Select
              value={reportType}
              label="סוג דוח"
              onChange={(e) => setReportType(e.target.value)}
              sx={{ borderRadius: '12px', fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
            >
              <MenuItem value="summary">סיכום כללי</MenuItem>
              <MenuItem value="supportsByCategory">תמיכות לפי קטגוריות</MenuItem>
              <MenuItem value="byOrganization">לפי ארגון</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>קרן</InputLabel>
            <Select
              value={selectedFund}
              label="קרן"
              onChange={(e) => setSelectedFund(e.target.value)}
              sx={{ borderRadius: '12px', fontSize: '0.85rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' } }}
            >
              <MenuItem value="">כל הקרנות</MenuItem>
              {funds.map((f) => {
                const fv = typeof f === 'string' ? f : f.value
                const fl = typeof f === 'string' ? f : f.label
                return <MenuItem key={fv} value={fv}>{fl}</MenuItem>
              })}
            </Select>
          </FormControl>

          <div className="flex gap-2">
            <Button
              variant="contained"
              onClick={handleGenerateReport}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.1,
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #0f766e, #115e59)' },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'צור דוח'}
            </Button>

            <Button
              variant="contained"
              onClick={handleDownload}
              disabled={!summaries || loading}
              startIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              }
              sx={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.1,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
                '&:disabled': { background: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' },
              }}
            >
              הורד Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Report Ready */}
      {summaries && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">הדוח מוכן</h3>
          <p className="text-sm text-gray-500 mb-4">הדוח נוצר בהצלחה ומוכן להורדה</p>
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 bg-gradient-to-l from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            הורד קובץ Excel
          </button>
        </div>
      )}

      <ConflictResolutionModal
        open={conflictModalOpen}
        conflict={currentConflict}
        onResolve={handleConflictResolve}
        onCancel={() => setConflictModalOpen(false)}
      />
    </div>
  )
}

export default ReportsTab

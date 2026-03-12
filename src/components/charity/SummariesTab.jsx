import React, { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { getAllFundsWithLabels } from '../../services/storageService'
import { summarizeByFundAndOrganization } from '../../services/summaryService'
import { useData } from '../../context/DataContext'
import ConflictResolutionModal from '../ConflictResolutionModal'

const SummariesTab = () => {
  const { googleSheetsId } = useData()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedFund, setSelectedFund] = useState('')
  const [summaries, setSummaries] = useState(null)
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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

  const handleGenerateSummary = async () => {
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
      setError(`שגיאה ביצירת סיכום: ${err.message}`)
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

  const formatCurrency = (amount) => {
    return amount?.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
  }

  const formatNumber = (amount) => {
    return amount?.toLocaleString('he-IL', { maximumFractionDigits: 0 }) || '0'
  }

  /* ── MUI field style ── */
  const fieldSx = {
    '& .MuiInputLabel-root': { fontSize: '0.84rem', color: '#6b7280' },
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: '0.86rem',
      backgroundColor: '#fff',
      '& fieldset': { borderColor: '#e5e7eb' },
      '&:hover fieldset': { borderColor: '#d1d5db' },
      '&.Mui-focused fieldset': { borderColor: '#0d9488', borderWidth: '1.5px' },
    },
  }

  /* ── Sure-style card wrapper ── */
  const cardStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
  }

  /* ── Table cell ── */
  const StyledTableCell = ({ children, isHeader, align = 'right', ...props }) => (
    <TableCell
      align={align}
      sx={{
        fontWeight: isHeader ? 600 : 400,
        fontSize: isHeader ? '0.76rem' : '0.84rem',
        color: isHeader ? '#6b7280' : '#1f2937',
        borderBottom: isHeader ? '1px solid #f3f4f6' : '1px solid #f9fafb',
        py: isHeader ? 1.2 : 1.4,
        px: 2,
        ...(isHeader && { textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#fafbfc' }),
      }}
      {...props}
    >
      {children}
    </TableCell>
  )

  /* ── Section Card (Sure style – like the chart cards) ── */
  const SectionCard = ({ title, subtitle, children }) => (
    <div className="overflow-hidden" style={{ ...cardStyle, marginBottom: 20 }}>
      <div style={{ padding: '20px 24px 0 24px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  )

  return (
    <div dir="rtl">
      {/* ═══════════ Header Row (Sure style) ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0 }}>סיכומים</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '4px 0 0 0' }}>סקירה כללית של פעילות התרומות</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              fontSize: 14, fontWeight: 600,
              color: '#fff',
              background: loading ? '#d1d5db' : '#0d9488',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            )}
            {loading ? 'טוען...' : 'רענן'}
          </button>
          <button
            onClick={handleGenerateSummary}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              fontSize: 14, fontWeight: 600,
              color: '#fff',
              background: loading ? '#d1d5db' : 'linear-gradient(135deg, #0d9488, #0f766e)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(13,148,136,0.25)',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            הצג סיכומים
          </button>
        </div>
      </div>

      {/* ═══════════ Filter Bar ═══════════ */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
        <div className="flex flex-wrap gap-4 items-end">
          <FormControl size="small" sx={{ minWidth: 170, ...fieldSx }}>
            <InputLabel>טווח תאריכים</InputLabel>
            <Select value={dateRange} label="טווח תאריכים" onChange={(e) => handleDateRangeChange(e.target.value)}>
              <MenuItem value="custom">טווח מותאם</MenuItem>
              <MenuItem value="year">מתחילת השנה</MenuItem>
              <MenuItem value="lastMonth">חודש קודם</MenuItem>
              <MenuItem value="thisMonth">חודש זה</MenuItem>
            </Select>
          </FormControl>

          {dateRange === 'custom' && (
            <>
              <TextField label="מ-תאריך" type="date" size="small" value={startDate ? startDate.toISOString().split('T')[0] : ''} onChange={(e) => setStartDate(new Date(e.target.value))} InputLabelProps={{ shrink: true }} sx={{ minWidth: 155, ...fieldSx }} />
              <TextField label="עד-תאריך" type="date" size="small" value={endDate ? endDate.toISOString().split('T')[0] : ''} onChange={(e) => setEndDate(new Date(e.target.value))} InputLabelProps={{ shrink: true }} sx={{ minWidth: 155, ...fieldSx }} />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 190, ...fieldSx }}>
            <InputLabel>קרן</InputLabel>
            <Select value={selectedFund} label="קרן" onChange={(e) => setSelectedFund(e.target.value)}>
              <MenuItem value="">כל הקרנות</MenuItem>
              {funds.map((f) => {
                const fv = typeof f === 'string' ? f : f.value
                const fl = typeof f === 'string' ? f : f.label
                return <MenuItem key={fv} value={fv}>{fl}</MenuItem>
              })}
            </Select>
          </FormControl>
        </div>
      </div>

      {/* ═══════════ Error ═══════════ */}
      {error && (
        <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="20" height="20" style={{ color: '#ef4444', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span style={{ fontSize: 14, color: '#b91c1c' }}>{error}</span>
        </div>
      )}

      {/* ═══════════ Results ═══════════ */}
      {summaries && (
        <div>
          {/* ════ 4 KPI Stat Cards (Sure Dashboard exact style) ════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              {
                label: 'תרומות',
                sublabel: 'סה"כ תרומות בתקופה',
                value: summaries.byTransactionType?.donations,
                iconBg: '#e6fffa',
                iconColor: '#0d9488',
                icon: (
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                label: 'מלגות',
                sublabel: 'סה"כ מלגות בתקופה',
                value: summaries.byTransactionType?.scholarships,
                iconBg: '#eff6ff',
                iconColor: '#3b82f6',
                icon: (
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                  </svg>
                ),
              },
              {
                label: 'תקורות',
                sublabel: 'סה"כ תקורות בתקופה',
                value: summaries.byTransactionType?.overheads,
                iconBg: '#fffbeb',
                iconColor: '#d97706',
                icon: (
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
              },
              {
                label: 'תמיכות',
                sublabel: 'סה"כ תמיכות בתקופה',
                value: summaries.byTransactionType?.supports,
                iconBg: '#faf5ff',
                iconColor: '#7c3aed',
                icon: (
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
            ].map(({ label, sublabel, value, iconBg, iconColor, icon }) => (
              <div
                key={label}
                style={{
                  ...cardStyle,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 180,
                }}
              >
                {/* Icon at top */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: iconColor,
                    }}
                  >
                    {icon}
                  </div>
                </div>

                {/* Number + Labels (centered) */}
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                    ₪{formatNumber(value)}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#4b5563', margin: '8px 0 0 0' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0 0' }}>
                    {sublabel}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ════ Total Card ════ */}
          <div
            style={{
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)', margin: 0 }}>סה"כ כללי</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '4px 0 0 0', lineHeight: 1.2 }}>
                ₪{formatCurrency(summaries.total?.totalAmount)}
              </p>
            </div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* ════ Two-Column Section (Sure dashboard: charts side by side) ════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Right: By Transaction Type */}
            <SectionCard title="סיכום לפי סוג פעולה" subtitle="החודש הנוכחי">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <StyledTableCell isHeader>סוג פעולה</StyledTableCell>
                      <StyledTableCell isHeader align="left">סכום (₪)</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: 'תרומות', value: summaries.byTransactionType?.donations },
                      { label: 'מלגות', value: summaries.byTransactionType?.scholarships },
                      { label: 'תקורות', value: summaries.byTransactionType?.overheads },
                      { label: 'תמיכות', value: summaries.byTransactionType?.supports, bold: true },
                      { label: 'סה"כ כללי', value: summaries.total?.totalAmount, bold: true, highlight: true },
                    ].map((row) => (
                      <TableRow key={row.label} sx={row.highlight ? { backgroundColor: '#f0fdfa' } : { '&:hover': { backgroundColor: '#fafbfc' } }}>
                        <StyledTableCell sx={row.bold ? { fontWeight: 700 } : {}}>{row.label}</StyledTableCell>
                        <StyledTableCell align="left" sx={row.bold ? { fontWeight: 700, color: row.highlight ? '#0d9488' : '#1f2937' } : {}}>
                          {formatCurrency(row.value)}
                        </StyledTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>

            {/* Left: By Category (progress bars – like donut chart) */}
            {Object.keys(summaries.byCategory || {}).length > 0 ? (
              <SectionCard title="סיכום לפי קטגוריה" subtitle="כל הקטגוריות">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(summaries.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                    const total = summaries.total?.totalAmount || 1
                    const pct = ((amt / total) * 100).toFixed(1)
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: '#374151' }}>{cat}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>₪{formatCurrency(amt)}</span>
                        </div>
                        <div style={{ width: '100%', height: 8, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, backgroundColor: '#0d9488', width: `${Math.min(parseFloat(pct), 100)}%`, transition: 'width 0.4s ease' }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0 0' }}>{pct}%</p>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            ) : (
              <SectionCard title="סיכום לפי קטגוריה" subtitle="כל הקטגוריות">
                <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 20 }}>אין נתונים זמינים</p>
              </SectionCard>
            )}
          </div>

          {/* ════ By Fund ════ */}
          {Object.keys(summaries.byFund || {}).length > 0 && (
            <SectionCard title="סיכום לפי קרן">
              {Object.entries(summaries.byFund).map(([fund, fundData]) => (
                <div key={fund} style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: '#f0fdfa', color: '#0f766e', fontSize: 12, fontWeight: 600, borderRadius: 8 }}>
                      {fund}
                    </span>
                  </div>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <StyledTableCell isHeader>סוג פעולה</StyledTableCell>
                          <StyledTableCell isHeader align="left">סכום (₪)</StyledTableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[
                          { label: 'תרומות', value: fundData.donations },
                          { label: 'מלגות', value: fundData.scholarships },
                          { label: 'תקורות', value: fundData.overheads },
                          { label: 'תמיכות', value: fundData.supports, bold: true },
                          { label: 'סה"כ', value: fundData.totalAmount, bold: true, highlight: true },
                        ].map((row) => (
                          <TableRow key={row.label} sx={row.highlight ? { backgroundColor: '#f0fdfa' } : { '&:hover': { backgroundColor: '#fafbfc' } }}>
                            <StyledTableCell sx={row.bold ? { fontWeight: 700 } : {}}>{row.label}</StyledTableCell>
                            <StyledTableCell align="left" sx={row.bold ? { fontWeight: 700 } : {}}>{formatCurrency(row.value)}</StyledTableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {Object.keys(fundData.supportsByCategory || {}).length > 0 && (
                    <div style={{ marginTop: 12, marginRight: 16, paddingRight: 16, borderRight: '2px solid #ccfbf1' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>תמיכות לפי קטגוריות:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {Object.entries(fundData.supportsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                          <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#4b5563' }}>{cat}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', fontFamily: 'monospace' }}>₪{formatCurrency(amt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </SectionCard>
          )}

          {/* ════ By Organization ════ */}
          {Object.keys(summaries.byOrganization || {}).map((org) => {
            const orgData = summaries.byOrganization[org]
            if (orgData.totalAmount === 0) return null
            return (
              <SectionCard key={org} title={`ארגון: ${org}`}>
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCell isHeader>סוג פעולה</StyledTableCell>
                        <StyledTableCell isHeader align="left">סכום (₪)</StyledTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { label: 'תרומות', value: orgData.donations },
                        { label: 'מלגות', value: orgData.scholarships },
                        { label: 'תקורות', value: orgData.overheads },
                        { label: 'תמיכות', value: orgData.supports, bold: true },
                        { label: 'סה"כ', value: orgData.totalAmount, bold: true, highlight: true },
                      ].map((row) => (
                        <TableRow key={row.label} sx={row.highlight ? { backgroundColor: '#f0fdfa' } : { '&:hover': { backgroundColor: '#fafbfc' } }}>
                          <StyledTableCell sx={row.bold ? { fontWeight: 700 } : {}}>{row.label}</StyledTableCell>
                          <StyledTableCell align="left" sx={row.bold ? { fontWeight: 700 } : {}}>{formatCurrency(row.value)}</StyledTableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {Object.keys(orgData.supportsByCategory || {}).length > 0 && (
                  <div style={{ marginRight: 16, paddingRight: 16, borderRight: '2px solid #ccfbf1' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>תמיכות לפי קטגוריות:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(orgData.supportsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#4b5563' }}>{cat}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', fontFamily: 'monospace' }}>₪{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )
          })}

          {/* ════ By Fund and Organization ════ */}
          {Object.keys(summaries.byFundAndOrganization || {}).length > 0 && (
            <SectionCard title="סיכום לפי קרן וארגון">
              {Object.entries(summaries.byFundAndOrganization).map(([fund, orgs]) => (
                <div key={fund} style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ display: 'inline-block', padding: '4px 14px', backgroundColor: '#f0fdfa', color: '#0f766e', fontSize: 12, fontWeight: 600, borderRadius: 8 }}>
                      {fund}
                    </span>
                  </div>
                  {Object.entries(orgs).map(([org, orgData]) => (
                    <div key={org} style={{ marginBottom: 16, marginRight: 16, paddingRight: 16, borderRight: '2px solid #ccfbf1' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{org}</p>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <StyledTableCell isHeader>סוג פעולה</StyledTableCell>
                              <StyledTableCell isHeader align="left">סכום (₪)</StyledTableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              { label: 'תרומות', value: orgData.donations },
                              { label: 'מלגות', value: orgData.scholarships },
                              { label: 'תקורות', value: orgData.overheads },
                              { label: 'תמיכות', value: orgData.supports, bold: true },
                              { label: 'סה"כ', value: orgData.totalAmount, bold: true, highlight: true },
                            ].map((row) => (
                              <TableRow key={row.label} sx={row.highlight ? { backgroundColor: '#f0fdfa' } : { '&:hover': { backgroundColor: '#fafbfc' } }}>
                                <StyledTableCell sx={row.bold ? { fontWeight: 700 } : {}}>{row.label}</StyledTableCell>
                                <StyledTableCell align="left" sx={row.bold ? { fontWeight: 700 } : {}}>{formatCurrency(row.value)}</StyledTableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {Object.keys(orgData.supportsByCategory || {}).length > 0 && (
                        <div style={{ marginTop: 8, marginRight: 16, paddingRight: 12, borderRight: '2px solid #e5e7eb' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>תמיכות לפי קטגוריות:</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {Object.entries(orgData.supportsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{cat}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', fontFamily: 'monospace' }}>₪{formatCurrency(amt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </SectionCard>
          )}
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

export default SummariesTab

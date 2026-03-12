import React, { useMemo, useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import SummariesPage from './SummariesPage'
import { loadMaorotData } from '../services/maorotStorage'
import { getAllFundsWithLabels } from '../services/storageService'
import { summarizeByFundAndOrganization } from '../services/summaryService'
import { useData } from '../context/DataContext'
import {
  buildSupportIdentifiers,
  findColumnIndex,
  formatDateDisplay,
  normalizeIdentifier,
  parseAmount,
  normalizeString,
} from '../utils/maorotUtils'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = [
  '#1e3a8a',
  '#059669',
  '#dc2626',
  '#0891b2',
  '#ea580c',
  '#0891b2',
  '#be185d',
  '#78350f',
]

const UnifiedSummariesPage = () => {
  const { googleSheetsId } = useData()
  const [maorotData, setMaorotData] = useState(() => loadMaorotData())
  const [selectedOrganizations, setSelectedOrganizations] = useState([])
  const [dateRange, setDateRange] = useState('thisMonth')
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [selectedFund, setSelectedFund] = useState([])
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState([])
  const [selectedFrames, setSelectedFrames] = useState([])
  const [funds, setFunds] = useState([])
  const [appliedFilters, setAppliedFilters] = useState(null)
  const [applyToken, setApplyToken] = useState(0)
  const [charitySummary, setCharitySummary] = useState(null)
  const [charityLoading, setCharityLoading] = useState(false)
  const [charityError, setCharityError] = useState(null)

  const formatCurrency = (amount) =>
    amount?.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ||
    '0.00'

  const activeFilters = appliedFilters || {
    selectedOrganizations,
    startDate,
    endDate,
    selectedFund,
    selectedTransactionTypes,
    selectedFrames,
  }

  useEffect(() => {
    const existingFunds = getAllFundsWithLabels()
    setFunds(existingFunds)
    const now = new Date()
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setEndDate(now)
  }, [])

  useEffect(() => {
    const refreshMaorotData = () => {
      setMaorotData(loadMaorotData())
    }

    window.addEventListener('maorotDataUpdated', refreshMaorotData)
    window.addEventListener('storage', refreshMaorotData)
    window.addEventListener('focus', refreshMaorotData)

    return () => {
      window.removeEventListener('maorotDataUpdated', refreshMaorotData)
      window.removeEventListener('storage', refreshMaorotData)
      window.removeEventListener('focus', refreshMaorotData)
    }
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

  useEffect(() => {
    const fetchCharitySummary = async () => {
      if (applyToken === 0) return
      const activeOrgs = activeFilters.selectedOrganizations || []
      const shouldFetchCharity =
        activeOrgs.length === 0 || activeOrgs.includes('מרכז הצדקה')
      if (!shouldFetchCharity) {
        setCharitySummary(null)
        return
      }
      if (!activeFilters.startDate || !activeFilters.endDate) return

      setCharityLoading(true)
      setCharityError(null)
      try {
        const fundParam =
          activeFilters.selectedFund && activeFilters.selectedFund.length > 0
            ? activeFilters.selectedFund
            : null
        const summary = await summarizeByFundAndOrganization(
          fundParam,
          activeFilters.startDate,
          activeFilters.endDate,
          googleSheetsId
        )
        setCharitySummary(summary)
      } catch (err) {
        setCharityError(err.message || 'שגיאה בטעינת נתוני מרכז הצדקה')
      } finally {
        setCharityLoading(false)
      }
    }

    fetchCharitySummary()
  }, [applyToken, activeFilters, googleSheetsId])

  const framesList = useMemo(() => {
    const supports = maorotData.supports || []
    const headers = maorotData.supportsHeaders || []
    const frameIndex = findColumnIndex(headers, ['מסגרת', 'frame'], null)
    if (!Number.isInteger(frameIndex)) return []
    const frames = supports
      .map((support) =>
        Array.isArray(support.rawRow) ? normalizeString(support.rawRow[frameIndex]) : ''
      )
      .filter(Boolean)
    return Array.from(new Set(frames))
  }, [maorotData])

  const returnSummaries = useMemo(() => {
    const rows = maorotData.returnFileRows || []
    const supports = maorotData.supports || []
    const headers = maorotData.supportsHeaders || []

    const categoryIndex = findColumnIndex(headers, ['קטגוריה', 'category'], null)
    const frameIndex = findColumnIndex(headers, ['מסגרת', 'frame'], null)

    const supportLookup = new Map()
    supports.forEach((support) => {
      const identifiers = buildSupportIdentifiers(support, headers)
      identifiers.forEach((id) => {
        if (id) supportLookup.set(id, support)
      })
    })

    const totalsByDate = {}
    const totalsByCategory = {}
    const totalsByFrame = {}

    rows.forEach((row) => {
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
      const dateKey = formatDateDisplay(row.date) || 'ללא תאריך'

      const categoryValue =
        supportMatch && Number.isInteger(categoryIndex) && Array.isArray(supportMatch.rawRow)
          ? normalizeString(supportMatch.rawRow[categoryIndex]) || 'לא סווג'
          : 'לא סווג'

      const frameValue =
        supportMatch && Number.isInteger(frameIndex) && Array.isArray(supportMatch.rawRow)
          ? normalizeString(supportMatch.rawRow[frameIndex]) || 'לא סווג'
          : 'לא סווג'

      const dateValue = row.date instanceof Date ? row.date : new Date(row.date)
      const activeStartDate = activeFilters.startDate
      const activeEndDate = activeFilters.endDate
      const activeFrames = activeFilters.selectedFrames || []
      const isInDateRange =
        (!activeStartDate || Number.isNaN(dateValue.getTime()) || dateValue >= activeStartDate) &&
        (!activeEndDate || Number.isNaN(dateValue.getTime()) || dateValue <= activeEndDate)
      const matchesFrame = activeFrames.length === 0 || activeFrames.includes(frameValue)

      if (!isInDateRange || !matchesFrame) {
        return
      }

      if (!totalsByDate[dateKey]) totalsByDate[dateKey] = 0
      totalsByDate[dateKey] += amount

      if (!totalsByCategory[categoryValue]) totalsByCategory[categoryValue] = 0
      totalsByCategory[categoryValue] += amount

      if (!totalsByFrame[frameValue]) totalsByFrame[frameValue] = 0
      totalsByFrame[frameValue] += amount
    })

    return { totalsByDate, totalsByCategory, totalsByFrame }
  }, [maorotData, activeFilters])

  const activeOrganizations = activeFilters.selectedOrganizations || []
  const activeTransactionTypes = activeFilters.selectedTransactionTypes || []
  const showCharity =
    activeOrganizations.length === 0 || activeOrganizations.includes('מרכז הצדקה')
  const showMaorot = activeOrganizations.length === 0 || activeOrganizations.includes('מאורות')
  const shouldShowSupports =
    activeTransactionTypes.length === 0 || activeTransactionTypes.includes('supports')

  const maorotTotalAmount = useMemo(() => {
    return Object.values(returnSummaries.totalsByFrame).reduce(
      (acc, value) => acc + (Number(value) || 0),
      0
    )
  }, [returnSummaries])

  const getCharityAmount = () => {
    if (!charitySummary || !charitySummary.total) return 0
    if (activeTransactionTypes.length === 0) return charitySummary.total.totalAmount || 0
    const map = {
      donations: 'donations',
      scholarships: 'scholarships',
      overheads: 'overheads',
      supports: 'supports',
    }
    return activeTransactionTypes.reduce((acc, type) => {
      const key = map[type]
      return acc + (key ? charitySummary.total[key] || 0 : 0)
    }, 0)
  }

  const orgChartData = useMemo(() => {
    const data = []
    if (showCharity) {
      data.push({ name: 'מרכז הצדקה', value: getCharityAmount() })
    }
    if (showMaorot && shouldShowSupports) {
      data.push({ name: 'מאורות', value: maorotTotalAmount })
    }
    return data.filter((entry) => entry.value > 0)
  }, [showCharity, showMaorot, shouldShowSupports, maorotTotalAmount, charitySummary, activeTransactionTypes])

  const frameChartData = useMemo(() => {
    return Object.entries(returnSummaries.totalsByFrame)
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0)
  }, [returnSummaries])

  const categoryTotals = useMemo(() => {
    const totals = {}
    const includeMaorot = showMaorot && shouldShowSupports
    if (includeMaorot) {
      Object.entries(returnSummaries.totalsByCategory).forEach(([name, value]) => {
        const amount = Number(value) || 0
        totals[name] = (totals[name] || 0) + amount
      })
    }

    if (showCharity && charitySummary?.byCategory) {
      Object.entries(charitySummary.byCategory).forEach(([name, value]) => {
        const amount = Number(value) || 0
        if (!name || amount === 0) return
        totals[name] = (totals[name] || 0) + amount
      })
    }

    return totals
  }, [returnSummaries, showMaorot, shouldShowSupports, showCharity, charitySummary])

  const categoryChartData = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0)
  }, [categoryTotals])

  const hasMaorotRows = (maorotData.returnFileRows || []).length > 0
  const hasMaorotCharts = frameChartData.length > 0 || categoryChartData.length > 0

  const handleApplyFilters = () => {
    setAppliedFilters({
      selectedOrganizations,
      startDate,
      endDate,
      selectedFund,
      selectedTransactionTypes,
      selectedFrames,
    })
    setApplyToken((prev) => prev + 1)
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, pt: 3 }}>
        <Paper elevation={8} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            שדות סינון
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>עמותה</InputLabel>
                <Select
                  multiple
                  value={selectedOrganizations}
                  label="עמותה"
                  onChange={(e) =>
                    setSelectedOrganizations(
                      typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                    )
                  }
                  renderValue={(selected) =>
                    selected.length === 0 ? 'ללא סינון' : selected.join(', ')
                  }
                >
                  <MenuItem value="מרכז הצדקה">
                    <Checkbox checked={selectedOrganizations.includes('מרכז הצדקה')} />
                    <ListItemText primary="מרכז הצדקה" />
                  </MenuItem>
                  <MenuItem value="מאורות">
                    <Checkbox checked={selectedOrganizations.includes('מאורות')} />
                    <ListItemText primary="מאורות" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
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
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="תאריך התחלה"
                    type="date"
                    value={startDate instanceof Date && !Number.isNaN(startDate.getTime()) ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="תאריך סיום"
                    type="date"
                    value={endDate instanceof Date && !Number.isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>קרן</InputLabel>
                <Select
                  multiple
                  value={selectedFund}
                  label="קרן"
                  onChange={(e) =>
                    setSelectedFund(
                      typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                    )
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'ללא סינון'
                    if (selected.length === 1) {
                      const fund = funds.find((f) =>
                        (typeof f === 'string' ? f : f.value) === selected[0]
                      )
                      return fund ? (typeof fund === 'string' ? fund : fund.label) : selected[0]
                    }
                    return `${selected.length} קרנות נבחרו`
                  }}
                >
                  {funds.map((f) => {
                    const fundValue = typeof f === 'string' ? f : f.value
                    const fundLabel = typeof f === 'string' ? f : f.label
                    return (
                      <MenuItem key={fundValue} value={fundValue}>
                        <Checkbox checked={selectedFund.includes(fundValue)} />
                        <ListItemText primary={fundLabel} />
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>סוג פעולה</InputLabel>
                <Select
                  multiple
                  value={selectedTransactionTypes}
                  label="סוג פעולה"
                  onChange={(e) =>
                    setSelectedTransactionTypes(
                      typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                    )
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'ללא סינון'
                    if (selected.length === 1) {
                      const map = {
                        donations: 'תרומות',
                        scholarships: 'מלגות',
                        overheads: 'תקורות',
                        supports: 'תמיכות',
                      }
                      return map[selected[0]] || selected[0]
                    }
                    return `${selected.length} סוגים נבחרו`
                  }}
                >
                  <MenuItem value="donations">
                    <Checkbox checked={selectedTransactionTypes.includes('donations')} />
                    <ListItemText primary="תרומות" />
                  </MenuItem>
                  <MenuItem value="scholarships">
                    <Checkbox checked={selectedTransactionTypes.includes('scholarships')} />
                    <ListItemText primary="מלגות" />
                  </MenuItem>
                  <MenuItem value="overheads">
                    <Checkbox checked={selectedTransactionTypes.includes('overheads')} />
                    <ListItemText primary="תקורות" />
                  </MenuItem>
                  <MenuItem value="supports">
                    <Checkbox checked={selectedTransactionTypes.includes('supports')} />
                    <ListItemText primary="תמיכות" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>מסגרת</InputLabel>
                <Select
                  multiple
                  value={selectedFrames}
                  label="מסגרת"
                  onChange={(e) =>
                    setSelectedFrames(
                      typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                    )
                  }
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'ללא סינון'
                    return selected.join(', ')
                  }}
                >
                  {framesList.map((frame) => (
                    <MenuItem key={frame} value={frame}>
                      <Checkbox checked={selectedFrames.includes(frame)} />
                      <ListItemText primary={frame} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                fullWidth
                sx={{
                  background: '#0891b2',
                  fontWeight: 700,
                  py: 1.5,
                  '&:hover': {
                    background: '#5a67d8',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                הצג נתונים
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {applyToken > 0 && showCharity && (
        <SummariesPage
          hideFilterUI
          externalFilters={{
            startDate: activeFilters.startDate,
            endDate: activeFilters.endDate,
            selectedFund: activeFilters.selectedFund,
            selectedTransactionTypes: activeFilters.selectedTransactionTypes,
            autoRun: applyToken,
          }}
        />
      )}

      {applyToken > 0 && (
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, pb: 6 }}>
          <Grid container spacing={3}>
            {orgChartData.length > 0 && (
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
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2', mb: 2 }}>
                      סיכום לפי עמותה
                    </Typography>
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={orgChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={40}
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={3}
                          labelLine={true}
                          label={({ name, value, percent }) =>
                            percent < 0.05 ? null : `${name} (${formatCurrency(value)} ₪)`
                          }
                        >
                          {orgChartData.map((entry, index) => (
                            <Cell key={`org-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${formatCurrency(value)} ₪`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {showMaorot && shouldShowSupports && frameChartData.length > 0 && (
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
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2', mb: 2 }}>
                      סיכום לפי מסגרת
                    </Typography>
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={frameChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={40}
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={3}
                          labelLine={true}
                          label={({ name, value, percent }) =>
                            percent < 0.05 ? null : `${name} (${formatCurrency(value)} ₪)`
                          }
                        >
                          {frameChartData.map((entry, index) => (
                            <Cell key={`frame-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${formatCurrency(value)} ₪`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {showMaorot && shouldShowSupports && categoryChartData.length > 0 && (
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
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0891b2', mb: 2 }}>
                      סיכום לפי קטגוריה
                    </Typography>
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={40}
                          dataKey="value"
                          stroke="#ffffff"
                          strokeWidth={3}
                          labelLine={true}
                          label={({ name, value, percent }) =>
                            percent < 0.05 ? null : `${name} (${formatCurrency(value)} ₪)`
                          }
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`category-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${formatCurrency(value)} ₪`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {showMaorot && shouldShowSupports && !hasMaorotRows && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              אין נתוני מאורות להצגה. יש להעלות קובץ חוזר וללחוץ על "שמור נתונים" בלשונית "העלאת נתונים".
            </Typography>
          )}

          {showMaorot && shouldShowSupports && hasMaorotRows && !hasMaorotCharts && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              אין נתוני מאורות לטווח/מסגרת שנבחרו.
            </Typography>
          )}

          {charityError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {charityError}
            </Typography>
          )}
          {charityLoading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              טוען נתוני מרכז הצדקה...
            </Typography>
          )}
          {showCharity && !charityLoading && !charityError && !charitySummary && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              אין נתוני מרכז הצדקה להצגה לטווח שנבחר.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export default UnifiedSummariesPage

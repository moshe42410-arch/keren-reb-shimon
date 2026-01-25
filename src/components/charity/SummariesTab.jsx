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
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Alert from '@mui/material/Alert'
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
      
      // אם יש קונפליקטים, מציג אותם אחד אחד
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#2e7d32' }}>
        סיכומים לפי תאריך
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
            onClick={handleGenerateSummary}
            disabled={loading}
            sx={{
              background: '#4caf50',
              '&:hover': {
                background: '#45a049',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'הצג סיכומים'}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {summaries && (
        <Box>
          {/* 1. סיכום כולל לפי סוג פעולה */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, background: '#ffffff' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
              סיכום כולל לפי סוג פעולה
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>סוג פעולה</strong></TableCell>
                    <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>תרומות</TableCell>
                    <TableCell align="right">{formatCurrency(summaries.byTransactionType.donations)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>מלגות</TableCell>
                    <TableCell align="right">{formatCurrency(summaries.byTransactionType.scholarships)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>תקורות</TableCell>
                    <TableCell align="right">{formatCurrency(summaries.byTransactionType.overheads)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>תמיכות</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(summaries.byTransactionType.supports)}</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>סה"כ כללי</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(summaries.total.totalAmount)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* 2. סיכום לפי קרן */}
          {Object.keys(summaries.byFund).length > 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: '#ffffff' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                סיכום לפי קרן
              </Typography>
              {Object.entries(summaries.byFund).map(([fund, fundData]) => (
                <Box key={fund} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                    קרן: {fund}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>סוג פעולה</strong></TableCell>
                          <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>תרומות</TableCell>
                          <TableCell align="right">{formatCurrency(fundData.donations)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>מלגות</TableCell>
                          <TableCell align="right">{formatCurrency(fundData.scholarships)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>תקורות</TableCell>
                          <TableCell align="right">{formatCurrency(fundData.overheads)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>תמיכות</strong></TableCell>
                          <TableCell align="right"><strong>{formatCurrency(fundData.supports)}</strong></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell><strong>סה"כ</strong></TableCell>
                          <TableCell align="right"><strong>{formatCurrency(fundData.totalAmount)}</strong></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* תמיכות לפי קטגוריות - לפי קרן */}
                  {Object.keys(fundData.supportsByCategory).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                        תמיכות לפי קטגוריות:
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>קטגוריה</strong></TableCell>
                              <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(fundData.supportsByCategory)
                              .sort((a, b) => b[1] - a[1])
                              .map(([category, amount]) => (
                                <TableRow key={category}>
                                  <TableCell>{category}</TableCell>
                                  <TableCell align="right">{formatCurrency(amount)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          )}

          {/* 3. סיכום לפי ארגון (מרכז הצדקה / מאורות) */}
          {Object.keys(summaries.byOrganization).map((org) => {
            const orgData = summaries.byOrganization[org]
            if (orgData.totalAmount === 0) return null
            
            return (
              <Paper key={org} elevation={3} sx={{ p: 3, mb: 3, background: '#ffffff' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                  סיכום לפי ארגון: {org}
                </Typography>
                <TableContainer sx={{ mb: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>סוג פעולה</strong></TableCell>
                        <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>תרומות</TableCell>
                        <TableCell align="right">{formatCurrency(orgData.donations)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>מלגות</TableCell>
                        <TableCell align="right">{formatCurrency(orgData.scholarships)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>תקורות</TableCell>
                        <TableCell align="right">{formatCurrency(orgData.overheads)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>תמיכות</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(orgData.supports)}</strong></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>סה"כ</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(orgData.totalAmount)}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* תמיכות לפי קטגוריות - לפי ארגון */}
                {Object.keys(orgData.supportsByCategory).length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      תמיכות לפי קטגוריות
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>קטגוריה</strong></TableCell>
                            <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(orgData.supportsByCategory)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, amount]) => (
                              <TableRow key={category}>
                                <TableCell>{category}</TableCell>
                                <TableCell align="right">{formatCurrency(amount)}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Paper>
            )
          })}

          {/* 4. סיכום לפי קרן וארגון */}
          {Object.keys(summaries.byFundAndOrganization).length > 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: '#ffffff' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                סיכום לפי קרן וארגון
              </Typography>
              {Object.entries(summaries.byFundAndOrganization).map(([fund, orgs]) => (
                <Box key={fund} sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2, mb: 2 }}>
                    קרן: {fund}
                  </Typography>
                  {Object.entries(orgs).map(([org, orgData]) => (
                    <Box key={org} sx={{ mb: 3, ml: 3, pl: 2, borderLeft: '2px solid #4caf50' }}>
                      <Typography variant="body1" gutterBottom sx={{ fontWeight: 600 }}>
                        ארגון: {org}
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>סוג פעולה</strong></TableCell>
                              <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>תרומות</TableCell>
                              <TableCell align="right">{formatCurrency(orgData.donations)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>מלגות</TableCell>
                              <TableCell align="right">{formatCurrency(orgData.scholarships)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>תקורות</TableCell>
                              <TableCell align="right">{formatCurrency(orgData.overheads)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>תמיכות</strong></TableCell>
                              <TableCell align="right"><strong>{formatCurrency(orgData.supports)}</strong></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell><strong>סה"כ</strong></TableCell>
                              <TableCell align="right"><strong>{formatCurrency(orgData.totalAmount)}</strong></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {/* תמיכות לפי קטגוריות - לפי קרן וארגון */}
                      {Object.keys(orgData.supportsByCategory).length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
                            תמיכות לפי קטגוריות:
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell><strong>קטגוריה</strong></TableCell>
                                  <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(orgData.supportsByCategory)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([category, amount]) => (
                                    <TableRow key={category}>
                                      <TableCell>{category}</TableCell>
                                      <TableCell align="right">{formatCurrency(amount)}</TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Paper>
          )}

          {/* 5. סיכום לפי קטגוריה (כל הקטגוריות) */}
          {Object.keys(summaries.byCategory).length > 0 && (
            <Paper elevation={3} sx={{ p: 3, mb: 3, background: '#ffffff' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                סיכום לפי קטגוריה (כל הקטגוריות)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>קטגוריה</strong></TableCell>
                      <TableCell align="right"><strong>סכום (₪)</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(summaries.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell align="right">{formatCurrency(amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
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

export default SummariesTab

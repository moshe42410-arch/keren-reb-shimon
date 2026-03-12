import React, { useState, useEffect } from 'react'
import { getAllFundsWithLabels, saveNewFund, updateFund, deleteFund } from '../services/storageService'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

const SummaryCard = ({ title, value, subtitle, accent, icon }) => (
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
        ניהול
      </Box>
    </Box>
    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
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

const FundsManagementPage = () => {
  const [funds, setFunds] = useState([])
  const [editingFund, setEditingFund] = useState(null)
  const [newFundName, setNewFundName] = useState('')
  const [editFundName, setEditFundName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadFunds()
    
    // האזנה לעדכוני קרנות
    const handleFundsUpdate = () => {
      loadFunds()
    }
    window.addEventListener('fundsUpdated', handleFundsUpdate)
    
    return () => {
      window.removeEventListener('fundsUpdated', handleFundsUpdate)
    }
  }, [])

  const loadFunds = () => {
    const allFunds = getAllFundsWithLabels()
    setFunds(allFunds)
  }

  const handleAddFund = () => {
    if (!newFundName || !newFundName.trim()) {
      setError('אנא הזן שם קרן')
      return
    }

    const fundNameToAdd = newFundName.trim()
    
    try {
      saveNewFund(fundNameToAdd)
      const updatedFunds = getAllFundsWithLabels()
      setFunds(updatedFunds)
      setNewFundName('')
      setShowAddForm(false)
      setError('')
      setSuccess(`קרן "${fundNameToAdd}" נוספה בהצלחה`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(`שגיאה בהוספת קרן: ${err.message}`)
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleEditStart = (fund) => {
    setEditingFund(fund)
    const fundValue = typeof fund === 'string' ? fund : fund.value
    setEditFundName(fundValue)
    setError('')
  }

  const handleEditSave = () => {
    if (!editingFund || !editFundName || !editFundName.trim()) {
      setError('אנא הזן שם קרן')
      return
    }

    try {
      const fundValue = typeof editingFund === 'string' ? editingFund : editingFund.value
      updateFund(fundValue, editFundName.trim())
      setEditingFund(null)
      setEditFundName('')
      setError('')
      setSuccess(`קרן עודכנה בהצלחה`)
      setTimeout(() => setSuccess(''), 3000)
      loadFunds()
    } catch (err) {
      setError(`שגיאה בעדכון קרן: ${err.message}`)
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDeleteFund = (fund) => {
    const fundValue = typeof fund === 'string' ? fund : fund.value
    const fundLabel = typeof fund === 'string' ? fund : fund.label
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את הקרן "${fundLabel}"?`)) {
      try {
        deleteFund(fundValue)
        // עדכון מיידי של הרשימה
        const updatedFunds = getAllFundsWithLabels()
        setFunds(updatedFunds)
        setError('')
        setSuccess(`קרן "${fundLabel}" נמחקה בהצלחה`)
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError(`שגיאה במחיקת קרן: ${err.message}`)
        setTimeout(() => setError(''), 5000)
      }
    }
  }

  const isDefaultFund = (fund) => {
    const fundValue = typeof fund === 'string' ? fund : fund.value
    const defaultFunds = ['5270', '5407', '5508', '5590', '5591', '5592']
    return defaultFunds.includes(fundValue)
  }

  const stats = [
    {
      title: 'סה"כ קרנות',
      value: `${funds.length}`,
      subtitle: 'מספר הקרנות שמוגדרות כרגע במערכת',
      accent: { main: '#0f766e', soft: '#ccfbf1', border: '#99f6e4' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3 1.3 3 3-1.3 3-3 3m0-15c1.4 0 2.7.4 3.8 1M12 8V5m0 14v-3m0 0c-1.4 0-2.7-.4-3.8-1" />
        </svg>
      ),
    },
    {
      title: 'קרנות קבועות',
      value: `${funds.filter((fund) => isDefaultFund(fund)).length}`,
      subtitle: 'קרנות ברירת מחדל שמוגדרות כקבועות',
      accent: { main: '#1d4ed8', soft: '#dbeafe', border: '#bfdbfe' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'מצב הוספה',
      value: showAddForm ? 'טופס פתוח' : 'מוכן להוספה',
      subtitle: showAddForm ? 'אפשר להזין קרן חדשה ולשמור' : 'לחץ על הוספת קרן כדי להתחיל',
      accent: { main: '#7c3aed', soft: '#f3e8ff', border: '#e9d5ff' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
        ניהול קרנות
      </Typography>
      <Typography sx={{ mb: 4, fontSize: 14, color: '#64748b' }}>
        מסך ניהול קרנות במראה חדש, נקי ואחיד עם שאר המערכת.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        {stats.map((stat) => (
          <SummaryCard key={stat.title} {...stat} />
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 5,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              רשימת קרנות
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>
              הוסף, ערוך או מחק קרנות מתוך ממשק מסודר וברור
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowAddForm(!showAddForm)
              setError('')
              setSuccess('')
            }}
            sx={{
              borderRadius: 3.5,
              px: 2.5,
              minHeight: 48,
              fontWeight: 700,
              boxShadow: '0 12px 24px rgba(20, 184, 166, 0.22)',
              background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
              },
            }}
          >
            {showAddForm ? 'ביטול' : 'הוסף קרן חדשה'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 4 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 4 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Add Fund Form */}
        {showAddForm && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: '#f8fafc',
              borderRadius: 4,
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, color: '#0f172a' }}>
              הוספת קרן חדשה
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
              הזן שם קרן חדש ושמור אותו לרשימה
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="שם הקרן"
                value={newFundName}
                onChange={(e) => setNewFundName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFund()
                  }
                }}
                placeholder="הזן שם קרן חדשה"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3.5,
                    backgroundColor: '#ffffff',
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddFund}
                sx={{
                  minWidth: 110,
                  borderRadius: 3.5,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                  },
                }}
              >
                שמור
              </Button>
            </Box>
          </Paper>
        )}

        {/* Funds List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {funds.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              אין קרנות זמינות
            </Typography>
          ) : (
            funds.map((fund, index) => {
              const fundValue = typeof fund === 'string' ? fund : fund.value
              const fundLabel = typeof fund === 'string' ? fund : fund.label
              const isDefault = isDefaultFund(fund)
              const isEditing = editingFund && (typeof editingFund === 'string' ? editingFund === fundValue : editingFund.value === fundValue)

              return (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2.25,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: isEditing ? '#f8fafc' : 'white',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    boxShadow: isEditing ? '0 12px 24px rgba(15, 23, 42, 0.06)' : 'none',
                  }}
                >
                  {isEditing ? (
                    <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        value={editFundName}
                        onChange={(e) => setEditFundName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSave()
                          }
                        }}
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            backgroundColor: '#ffffff',
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleEditSave}
                        sx={{
                          borderRadius: 3,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                          },
                        }}
                      >
                        שמור
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingFund(null)
                          setEditFundName('')
                          setError('')
                        }}
                      >
                        ביטול
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {fundLabel}
                        </Typography>
                        {isDefault && (
                          <Box
                            component="span"
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              fontSize: '0.75rem',
                              bgcolor: '#e3f2fd',
                              color: '#1976d2',
                              borderRadius: 999,
                              fontWeight: 600
                            }}
                          >
                            קרן קבועה
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditStart(fund)}
                          size="small"
                          sx={{
                            border: '1px solid #bfdbfe',
                            backgroundColor: '#eff6ff',
                            '&:hover': { backgroundColor: '#dbeafe' },
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteFund(fund)}
                          size="small"
                          sx={{
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff1f2',
                            '&:hover': { backgroundColor: '#ffe4e6' },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </>
                  )}
                </Paper>
              )
            })
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default FundsManagementPage

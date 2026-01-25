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
        ניהול קרנות
      </Typography>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            רשימת קרנות
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowAddForm(!showAddForm)
              setError('')
              setSuccess('')
            }}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              }
            }}
          >
            {showAddForm ? 'ביטול' : 'הוסף קרן חדשה'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Add Fund Form */}
        {showAddForm && (
          <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              הוספת קרן חדשה
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
              />
              <Button
                variant="contained"
                onClick={handleAddFund}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  }
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
                  elevation={1}
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: isEditing ? '#f5f5f5' : 'white'
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
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleEditSave}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                          }
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
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
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
                              borderRadius: 1,
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
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteFund(fund)}
                          size="small"
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

import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { parseExcelFile, processExcelData } from '../services/excelParser'
import { saveExcelData, hasExcelData, getAllFunds, getAllFundsWithLabels, saveNewFund } from '../services/storageService'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

const FileUploader = () => {
  const { updateExcelData, updateProcessedData, googleSheetsId, selectedFund, updateSelectedFund } = useData()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fund, setFund] = useState(selectedFund || '')
  const [month, setMonth] = useState('')
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [pendingData, setPendingData] = useState(null)
  const [funds, setFunds] = useState([])
  const [newFundName, setNewFundName] = useState('')
  const [showNewFundInput, setShowNewFundInput] = useState(false)

  useEffect(() => {
    // טוען רשימת קרנות
    const allFunds = getAllFundsWithLabels()
    setFunds(allFunds)
  }, [])

  // מפיק חודש מתאריך או משם הקובץ
  const extractMonthFromFile = (fileName, fileDate) => {
    // מנסה למצוא תאריך בשם הקובץ
    const dateMatch = fileName.match(/(\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const year = parseInt(dateMatch[2]);
      const fullYear = year < 100 ? 2000 + year : year;
      return `${fullYear}-${String(month).padStart(2, '0')}`;
    }
    
    // אם יש תאריך בקובץ, משתמש בו
    if (fileDate) {
      const date = new Date(fileDate);
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    }
    
    // ברירת מחדל: חודש נוכחי
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile)
        setError(null)
        setSuccess(false)
        
        // מנסה לזהות חודש משם הקובץ
        const detectedMonth = extractMonthFromFile(selectedFile.name)
        setMonth(detectedMonth)
      } else {
        setError('אנא בחר קובץ Excel (.xlsx או .xls)')
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('אנא בחר קובץ לעיבוד')
      return
    }

    if (!fund) {
      setError('אנא בחר קרן לשיוך הקובץ')
      return
    }

    if (!month) {
      setError('אנא בחר חודש')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // מפענח את קובץ האקסל
      const parsed = await parseExcelFile(file)
      
      // מעבד את הנתונים
      const processed = processExcelData(parsed.rawData)
      
      if (!processed) {
        throw new Error('לא הצלחתי לעבד את הקובץ')
      }

      // בודק אם קיימים נתונים עבור קרן וחודש זה
      if (hasExcelData(fund, month)) {
        // יש נתונים קיימים - מציג דיאלוג אזהרה
        setPendingData({ parsed, processed, fund, month })
        setDuplicateDialogOpen(true)
        setLoading(false)
        return
      }

      // אין נתונים קיימים - שומר ישירות
      await saveDataAndUpdate(parsed, processed, fund, month)
      
    } catch (err) {
      setError(`שגיאה בעיבוד הקובץ: ${err.message}`)
      setLoading(false)
    }
  }

  const saveDataAndUpdate = async (parsed, processed, fundName, monthKey) => {
    try {
      // שומר ב-localStorage
      saveExcelData(fundName, monthKey, {
        excelData: parsed,
        processedData: processed,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
      })

      // מעדכן את ה-context
      updateExcelData(parsed)
      updateProcessedData(processed)
      updateSelectedFund(fundName)
      
      // מעדכן רשימת קרנות
      const allFunds = getAllFundsWithLabels()
      setFunds(allFunds)
      
      setSuccess(true)
      setDuplicateDialogOpen(false)
      setPendingData(null)
    } catch (err) {
      setError(`שגיאה בשמירת הנתונים: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateConfirm = async () => {
    if (pendingData) {
      await saveDataAndUpdate(
        pendingData.parsed, 
        pendingData.processed, 
        pendingData.fund, 
        pendingData.month
      )
    }
  }

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false)
    setPendingData(null)
    setLoading(false)
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 700, color: '#111827', fontSize: '1.1rem' }}>
        העלאת קובץ Excel חודשי
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>בחר קרן</InputLabel>
          <Select
            value={fund}
            label="בחר קרן"
            onChange={(e) => {
              const value = e.target.value
              if (value === '__NEW__') {
                setShowNewFundInput(true)
                setFund('')
              } else {
                setFund(value)
                updateSelectedFund(value)
                setShowNewFundInput(false)
                setNewFundName('')
              }
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
            <MenuItem value="__NEW__">+ הוסף קרן חדשה</MenuItem>
          </Select>
        </FormControl>

        {showNewFundInput && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="שם קרן חדשה"
              placeholder="הזן שם קרן חדשה"
              value={newFundName}
              onChange={(e) => setNewFundName(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              onClick={() => {
                if (newFundName && newFundName.trim()) {
                  try {
                    saveNewFund(newFundName.trim())
                    setFund(newFundName.trim())
                    updateSelectedFund(newFundName.trim())
                    setShowNewFundInput(false)
                    // מעדכן את רשימת הקרנות
                    const allFunds = getAllFundsWithLabels()
                    setFunds(allFunds)
                    setNewFundName('')
                  } catch (err) {
                    setError(`שגיאה בשמירת קרן חדשה: ${err.message}`)
                  }
                } else {
                  setError('אנא הזן שם קרן')
                }
              }}
              sx={{
                background: '#0d9488',
                '&:hover': {
                  background: '#0f766e',
                },
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                mt: 1,
              }}
            >
              שמור קרן
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setShowNewFundInput(false)
                setNewFundName('')
                setFund('')
              }}
              sx={{
                borderColor: '#d1d5db',
                color: '#6b7280',
                borderRadius: '10px',
                textTransform: 'none',
                mt: 1,
              }}
            >
              ביטול
            </Button>
          </Box>
        )}

        <TextField
          label="חודש (YYYY-MM)"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="2026-01"
          helperText="פורמט: YYYY-MM (למשל: 2026-01)"
          sx={{ minWidth: 200 }}
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <input
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          id="excel-file-upload"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="excel-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUploadIcon />}
            sx={{ 
              mr: 2,
              padding: '10px 24px',
              borderColor: '#0d9488',
              color: '#0d9488',
              borderRadius: '10px',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#0f766e',
                background: 'rgba(13, 148, 136, 0.06)',
              },
              transition: 'all 0.15s ease',
            }}
          >
            בחר קובץ Excel
          </Button>
        </label>
        
        {file && (
          <Typography variant="body2" color="text.secondary" component="span">
            קובץ נבחר: {file.name}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          הקובץ נטען בהצלחה!
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={loading || !file || !fund || !month}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        sx={{
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          color: 'white',
          padding: '12px 32px',
          fontSize: '1rem',
          fontWeight: 600,
          borderRadius: '10px',
          textTransform: 'none',
          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0f766e, #115e59)',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
          },
          '&:disabled': {
            background: '#e5e7eb',
            color: '#9ca3af',
            boxShadow: 'none',
          },
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? 'מעבד...' : 'עבד קובץ'}
      </Button>

      {/* Dialog לאזהרה על כפילות */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={handleDuplicateCancel}
      >
        <DialogTitle>אזהרה: נתונים קיימים</DialogTitle>
        <DialogContent>
          <DialogContentText>
            נמצאו נתונים קיימים עבור קרן "{pendingData?.fund}" וחודש {pendingData?.month}.
            <br />
            האם אתה רוצה לדרוס את הנתונים הקיימים?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDuplicateCancel} color="secondary">
            ביטול
          </Button>
          <Button onClick={handleDuplicateConfirm} color="primary" variant="contained">
            דרוס נתונים קיימים
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FileUploader

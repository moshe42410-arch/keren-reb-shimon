import React, { useState, useEffect } from 'react'
import { useData } from '../../context/DataContext'
import { fetchAllCategoriesData, findCategoryInData, addOrUpdateCategory } from '../../services/googleSheets'
import { exportToExcel, exportByCategory } from '../../services/exportUtils'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DownloadIcon from '@mui/icons-material/Download'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const SupportCategoriesSummary = () => {
  const { processedData, googleSheetsId, updateCategoriesData } = useData()
  const [supportRows, setSupportRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const [categoryInput, setCategoryInput] = useState('')
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

  useEffect(() => {
    if (processedData && googleSheetsId) {
      processSupportCategories()
    } else if (processedData) {
      // אם אין Google Sheets ID - עדיין נציג את השורות
      const supportRowsData = processedData.rows.filter(row => 
        row.type && (String(row.type).toLowerCase().includes('תמיכות') || 
                     String(row.type).toLowerCase().includes('תמיכה') ||
                     String(row.type).toLowerCase().includes('support'))
      )
      
      const rowsWithCategories = supportRowsData.map(row => ({
        ...row,
        category: 'ללא קטגוריה'
      }))
      
      setSupportRows(rowsWithCategories)
      setLoading(false)
    }
  }, [processedData, googleSheetsId])

  const processSupportCategories = async () => {
    if (!processedData || !googleSheetsId) {
      console.warn('חסרים נתונים לעיבוד:', { processedData: !!processedData, googleSheetsId })
      return
    }

    // מסנן רק שורות שהן "תמיכות" - חיפוש גמיש יותר
    const supportRowsData = processedData.rows.filter(row => {
      if (!row.type) return false
      const typeStr = String(row.type).toLowerCase()
      return typeStr.includes('תמיכות') || 
             typeStr.includes('תמיכה') || 
             typeStr.includes('support') ||
             typeStr === 'תמיכות'
    })

    console.log(`נמצאו ${supportRowsData.length} שורות תמיכות`)

    if (supportRowsData.length === 0) {
      setSupportRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
        // קורא את כל הנתונים מ-Google Sheets פעם אחת
        console.log('קורא את כל הנתונים מ-Google Sheets פעם אחת...')
        const categoriesData = await fetchAllCategoriesData(googleSheetsId)
        console.log(`✓ נקראו ${categoriesData.length} שורות מ-Google Sheets`)
        
        // עובר על כל שורת תמיכה ומחפש קטגוריה בנתונים המקומיים
        console.log(`מחפש קטגוריות עבור ${supportRowsData.length} שורות תמיכות...`)
        const rowsWithCategories = supportRowsData.map((row, index) => {
            // משתמש בנתונים שכבר חושבו ב-processExcelData
            const idNumber = row.idNumber || ''
            const date = row.date || ''
            const amount = row.amount || 0

            // מחפש קטגוריה בנתונים המקומיים (לא קורא מ-API)
            const category = findCategoryInData(categoriesData, idNumber, date, amount)

            if (category && index < 5) {
              // לוג רק עבור 5 השורות הראשונות כדי לא להציף את הקונסול
              console.log(`✓ שורה ${index + 1}: נמצאה קטגוריה עבור מ.ז ${idNumber}: ${category}`)
            }

            return {
              ...row,
              category: category || 'ללא קטגוריה'
            }
        })

        const foundCategories = rowsWithCategories.filter(r => r.category !== 'ללא קטגוריה').length
        console.log(`✓ סיימתי עיבוד: נמצאו ${foundCategories} קטגוריות מתוך ${rowsWithCategories.length} שורות`)
        setSupportRows(rowsWithCategories)
    } catch (err) {
      console.error('שגיאה כללית בעיבוד קטגוריות:', err)
      setError(`שגיאה בעיבוד קטגוריות: ${err.message}. בדוק את הקונסול לפרטים נוספים.`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCategory = (row) => {
    setSelectedRow(row)
    setCategoryInput(row.category || '')
    setEditDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!selectedRow || !categoryInput.trim()) return

    setLoading(true)
    try {
      // מעדכן ב-Google Sheets אם אפשר
      if (googleSheetsId) {
        try {
          await addOrUpdateCategory(googleSheetsId, {
            idNumber: selectedRow.idNumber,
            date: selectedRow.date,
            amount: selectedRow.amount,
            category: categoryInput
          })
        } catch (err) {
          console.warn('Could not update Google Sheets, updating locally only:', err)
        }
      }

      // מעדכן במצב המקומי
      setSupportRows(prevRows =>
        prevRows.map(row =>
          row.rowIndex === selectedRow.rowIndex
            ? { ...row, category: categoryInput.trim() }
            : row
        )
      )

      setEditDialogOpen(false)
      setSelectedRow(null)
      setCategoryInput('')
    } catch (err) {
      setError(`שגיאה בעדכון הקטגוריה: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const summarizeByCategory = () => {
    const summary = {}
    supportRows.forEach(row => {
      const cat = row.category || 'ללא קטגוריה'
      if (!summary[cat]) {
        summary[cat] = {
          category: cat,
          count: 0,
          totalAmount: 0
        }
      }
      summary[cat].count += 1
      summary[cat].totalAmount += row.amount
    })
    return summary
  }

  const categorySummary = summarizeByCategory()
  
  const chartData = Object.values(categorySummary).map(item => ({
    name: item.category,
    value: item.totalAmount,
    count: item.count
  }))
  
  const handleDownloadSummary = () => {
    const data = Object.values(categorySummary).map(item => ({
      'קטגוריה': item.category,
      'מספר תמיכות': item.count,
      'סכום כולל': item.totalAmount
    }))
    
    exportToExcel(
      data,
      'סיכום תמיכות לפי קטגוריה',
      `סיכום_תמיכות_קטגוריות_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }
  
  const handleDownloadByCategory = () => {
    exportByCategory(
      supportRows,
      'category',
      `תמיכות_קטגוריה_${new Date().toISOString().split('T')[0]}`
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    )
  }

  if (!processedData) {
    return (
      <Typography variant="body1" color="text.secondary">
        אנא העלה קובץ Excel תחילה
      </Typography>
    )
  }

  if (!googleSheetsId) {
    return (
      <Alert severity="warning">
        לא הוגדר קישור ל-Google Sheets. הקטגוריות לא יטענו אוטומטית.
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <br />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          טיפים לפתרון:
          <ul style={{ marginTop: '8px', paddingRight: '20px' }}>
            <li>ודא שהגיליון משותף עם "כל מי שיש לו קישור" (Viewer)</li>
            <li>בדוק את הקונסול (F12) לפרטים נוספים</li>
            <li>אם יש מפתח API, ודא שהוא תקין בקובץ .env</li>
          </ul>
        </Typography>
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          סיכום תמיכות לפי קטגוריות
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadSummary}
          >
            הורד סיכום Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadByCategory}
            disabled={supportRows.length === 0}
          >
            הורד לפי קטגוריה
          </Button>
        </Box>
      </Box>

      {chartData.length > 0 && (
        <Box sx={{ mb: 4, height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>קטגוריה</TableCell>
              <TableCell align="right">מספר תמיכות</TableCell>
              <TableCell align="right">סכום כולל</TableCell>
              <TableCell align="right">סכום ממוצע</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(categorySummary).map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.category}</TableCell>
                <TableCell align="right">{item.count}</TableCell>
                <TableCell align="right">{item.totalAmount.toLocaleString('he-IL')} ₪</TableCell>
                <TableCell align="right">
                  {item.count > 0 ? (item.totalAmount / item.count).toLocaleString('he-IL') : 0} ₪
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        שורות ללא קטגוריה או לעדכון
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>שורה</TableCell>
              <TableCell>מספר זהות</TableCell>
              <TableCell>תאריך</TableCell>
              <TableCell>סכום</TableCell>
              <TableCell>קטגוריה נוכחית</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supportRows
              .filter(row => !row.category || row.category === 'ללא קטגוריה')
              .map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.rowIndex}</TableCell>
                  <TableCell>{row.idNumber}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.amount.toLocaleString('he-IL')} ₪</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditCategory(row)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>עדכון קטגוריה</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="קטגוריה"
            fullWidth
            variant="standard"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>ביטול</Button>
          <Button onClick={handleSaveCategory}>שמור</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SupportCategoriesSummary

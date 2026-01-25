import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import DownloadIcon from '@mui/icons-material/Download'
import { exportToExcel } from '../../services/exportUtils'

const FeesSummary = ({ summary }) => {
  if (!summary) {
    return (
      <Typography variant="body1" color="text.secondary">
        אין נתונים להצגה
      </Typography>
    )
  }

  const handleDownload = () => {
    const data = [
      { 'סיכום עמלות': 'סה"כ עמלות', 'סכום': summary.totalFees },
      { 'סיכום עמלות': 'עמלה ממוצעת', 'סכום': summary.averageFee }
    ]

    summary.byRow.forEach((row, index) => {
      data.push({
        'שורה': row.rowIndex,
        'עמלה O': row.feeO,
        'עמלה P': row.feeP,
        'עמלה Q': row.feeQ,
        'סה"כ עמלה': row.totalFee
      })
    })

    exportToExcel(
      data,
      'סיכום עמלות',
      `סיכום_עמלות_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          סיכום עמלות (עמודות O+P+Q)
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          הורד Excel
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                סה"כ עמלות
              </Typography>
              <Typography variant="h4">
                {summary.totalFees.toLocaleString('he-IL')} ₪
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                עמלה ממוצעת
              </Typography>
              <Typography variant="h4">
                {summary.averageFee.toLocaleString('he-IL')} ₪
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                מספר שורות עם עמלות
              </Typography>
              <Typography variant="h4">
                {summary.byRow.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default FeesSummary

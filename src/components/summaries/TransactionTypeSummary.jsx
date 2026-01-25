import React from 'react'
import { useData } from '../../context/DataContext'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Button from '@mui/material/Button'
import DownloadIcon from '@mui/icons-material/Download'
import { exportToExcel, exportByType } from '../../services/exportUtils'

const TransactionTypeSummary = ({ summary }) => {
  const { processedData } = useData()
  
  if (!summary || Object.keys(summary).length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        אין נתונים להצגה
      </Typography>
    )
  }

  const chartData = Object.values(summary).map(item => ({
    name: item.type || 'ללא סוג',
    סכום: item.totalAmount,
    כמות: item.count
  }))

  const handleDownload = () => {
    const data = Object.values(summary).map(item => ({
      'סוג תנועה': item.type || 'ללא סוג',
      'מספר תנועות': item.count,
      'סכום כולל': item.totalAmount
    }))

    exportToExcel(
      data,
      'סיכום לפי סוג תנועה',
      `סיכום_סוג_תנועה_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const handleDownloadByType = () => {
    if (!processedData || !processedData.rows) return
    
    exportByType(
      processedData.rows,
      'type',
      `סוג_תנועה_${new Date().toISOString().split('T')[0]}`
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          סיכום לפי סוג תנועה (עמודה G)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            הורד סיכום Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadByType}
          >
            הורד לפי סוג תנועה
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 4, height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="סכום" fill="#8884d8" />
            <Bar dataKey="כמות" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>סוג תנועה</TableCell>
              <TableCell align="right">מספר תנועות</TableCell>
              <TableCell align="right">סכום כולל</TableCell>
              <TableCell align="right">סכום ממוצע</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(summary).map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.type || 'ללא סוג'}</TableCell>
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
    </Box>
  )
}

export default TransactionTypeSummary

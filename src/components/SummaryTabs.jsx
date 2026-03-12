import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { 
  summarizeByTransactionType, 
  summarizeFees 
} from '../services/excelParser'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TransactionTypeSummary from './summaries/TransactionTypeSummary'
import FeesSummary from './summaries/FeesSummary'
import SupportCategoriesSummary from './summaries/SupportCategoriesSummary'

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const SummaryTabs = () => {
  const { processedData } = useData()
  const [tabValue, setTabValue] = useState(0)
  const [transactionSummary, setTransactionSummary] = useState(null)
  const [feesSummary, setFeesSummary] = useState(null)

  useEffect(() => {
    if (processedData) {
      const transSummary = summarizeByTransactionType(processedData)
      const feesSum = summarizeFees(processedData)
      
      setTransactionSummary(transSummary)
      setFeesSummary(feesSum)
    }
  }, [processedData])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  if (!processedData) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center">
          אנא העלה קובץ Excel כדי לראות סיכומים
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper 
      elevation={0}
      sx={{
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 3,
      }}
    >
      <Box sx={{ 
        borderBottom: 2, 
        borderColor: 'divider',
        background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(14, 116, 144, 0.1) 100%)',
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              color: '#666',
              '&.Mui-selected': {
                color: '#0891b2',
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="סיכום לפי סוג תנועה" />
          <Tab label="סיכום עמלות" />
          <Tab label="סיכום תמיכות לפי קטגוריות" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <TransactionTypeSummary summary={transactionSummary} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <FeesSummary summary={feesSummary} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <SupportCategoriesSummary />
      </TabPanel>
    </Paper>
  )
}

export default SummaryTabs

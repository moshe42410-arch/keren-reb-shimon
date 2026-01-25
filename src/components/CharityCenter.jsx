import React, { useState } from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import SummariesTab from './charity/SummariesTab'
import ReportsTab from './charity/ReportsTab'
import FileUploader from './FileUploader'
import Typography from '@mui/material/Typography'

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const CharityCenter = () => {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* File Uploader */}
      <Box sx={{ mb: 4 }}>
        <FileUploader />
      </Box>

      {/* Calculator Image */}
      <Box 
        sx={{ 
          textAlign: 'center', 
          mb: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 3,
        }}
      >
        <Box
          component="img"
          src="/מחשבון.png"
          alt="מחשבון"
          sx={{
            maxWidth: { xs: '250px', md: '400px' },
            width: '100%',
            height: 'auto',
            filter: 'drop-shadow(0 10px 30px rgba(76, 175, 80, 0.3))',
            animation: 'float 3s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px)',
              },
              '50%': {
                transform: 'translateY(-20px)',
              },
            },
          }}
          onError={(e) => {
            console.warn('Calculator image not found, trying alternative path');
            e.target.src = '/calculator.png';
          }}
        />
      </Box>

      {/* Sub Tabs */}
      <Box sx={{ 
        borderBottom: 2, 
        borderColor: '#e8f5e9',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px 12px 0 0',
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              color: '#666',
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#4caf50',
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              background: '#4caf50',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab label="סיכומים" />
          <Tab label="דוחות" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <SummariesTab />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ReportsTab />
      </TabPanel>
    </Box>
  )
}

export default CharityCenter

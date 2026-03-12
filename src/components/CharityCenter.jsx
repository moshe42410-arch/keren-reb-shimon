import React, { useState } from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import SummariesTab from './charity/SummariesTab'
import ReportsTab from './charity/ReportsTab'
import FileUploader from './FileUploader'

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
    <Box
      sx={{
        width: '100%',
        maxWidth: 1360,
        mx: 'auto',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* File Uploader Card */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          p: { xs: 2, md: 3 },
          mb: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <FileUploader />
      </Box>

      {/* Calculator Image */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: { xs: 1.5, md: 2 },
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Box
          component="img"
          src="/מחשבון.png"
          alt="מחשבון"
          sx={{
            maxWidth: { xs: '220px', md: '340px' },
            width: '100%',
            height: 'auto',
            filter: 'drop-shadow(0 8px 22px rgba(13, 148, 136, 0.15))',
          }}
          onError={(e) => {
            console.warn('Calculator image not found, trying alternative path')
            e.target.src = '/calculator.png'
          }}
        />
      </Box>

      {/* Tabs Card (Sure style) */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: { xs: 1.5, md: 2 }, pt: 0.5 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                fontWeight: 600,
                fontSize: '0.88rem',
                color: '#6b7280',
                textTransform: 'none',
                borderRadius: '10px 10px 0 0',
                transition: 'color 0.15s ease',
                px: 3,
                '&:hover': {
                  color: '#0f766e',
                  backgroundColor: '#f0fdfa',
                },
                '&.Mui-selected': {
                  color: '#0d9488',
                  fontWeight: 700,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0d9488',
                height: 2.5,
                borderRadius: '2px 2px 0 0',
              },
            }}
          >
            <Tab label="סיכומים" />
            <Tab label="דוחות" />
          </Tabs>
        </Box>

        {/* Thin separator */}
        <Box sx={{ height: '1px', backgroundColor: '#f3f4f6' }} />
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

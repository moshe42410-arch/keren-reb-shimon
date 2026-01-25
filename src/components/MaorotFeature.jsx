import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import InfoIcon from '@mui/icons-material/Info'

const MaorotFeature = () => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 6,
          maxWidth: 800,
          mx: 'auto',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: 3,
        }}
      >
        <InfoIcon 
          sx={{ 
            fontSize: 80, 
            color: '#81c784', 
            mb: 3,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
              },
              '50%': {
                opacity: 0.5,
              },
            },
          }} 
        />
        <Typography 
          variant="h4" 
          component="h2"
          gutterBottom
          sx={{ 
            color: '#2e7d32',
            fontWeight: 700,
            mb: 3,
          }}
        >
          הפיצ'ר בדרך אליכם
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#666',
            lineHeight: 1.8,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          אנחנו עובדים ברגעים אלו על פיתוח הפונקציה כדי להעניק לכם את החוויה הטובה ביותר.
          <br />
          היא תהיה זמינה באתר בקרוב מאוד.
          <br />
          <strong style={{ color: '#4caf50' }}>שווה לחכות!</strong>
        </Typography>
      </Paper>
    </Box>
  )
}

export default MaorotFeature

import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'

const ConflictResolutionModal = ({ open, conflict, onResolve, onCancel }) => {
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // בוחר את הקטגוריה הראשונה כברירת מחדל
  React.useEffect(() => {
    if (conflict && conflict.matchingCategories && conflict.matchingCategories.length > 0) {
      // איפוס בחירה כשהקונפליקט משתנה
      setSelectedCategory('')
      // בחירת הראשונה אחרי קצת זמן - עם value ייחודי
      setTimeout(() => {
        const firstMatch = conflict.matchingCategories[0]
        const uniqueValue = `${firstMatch.category}__${firstMatch.rowIndex}__${firstMatch.id}__0`
        setSelectedCategory(uniqueValue)
      }, 100)
    }
  }, [conflict?.idNumber, conflict?.date, conflict?.amount])
  
  if (!conflict) return null
  
  const handleResolve = () => {
    if (selectedCategory && onResolve) {
      // חילוץ שם הקטגוריה מה-value הייחודי
      const categoryName = selectedCategory.split('__')[0]
      onResolve(conflict, categoryName)
    }
  }
  
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        קונפליקט בקטגוריות - נדרש לבחור קטגוריה
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            נמצאו מספר קטגוריות תואמות לתנועה זו. אנא בחר את הקטגוריה הנכונה:
          </Typography>
        </Box>
        
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2" gutterBottom>
            פרטי התנועה:
          </Typography>
          <Typography variant="body2">
            <strong>מ.ז:</strong> {conflict.idNumber}
          </Typography>
          <Typography variant="body2">
            <strong>תאריך:</strong> {String(conflict.date || '')}
          </Typography>
          <Typography variant="body2">
            <strong>סכום:</strong> {conflict.amount?.toLocaleString('he-IL')} ₪
          </Typography>
          {conflict.fund && (
            <Typography variant="body2">
              <strong>קרן:</strong> {conflict.fund}
            </Typography>
          )}
          {conflict.organization && (
            <Typography variant="body2">
              <strong>ארגון:</strong> {conflict.organization}
            </Typography>
          )}
        </Paper>
        
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">בחר קטגוריה:</FormLabel>
          <RadioGroup
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
            }}
          >
            {conflict.matchingCategories?.map((match, index) => {
              // יצירת key ייחודי לכל אפשרות - גם ל-value
              const uniqueValue = `${match.category}__${match.rowIndex}__${match.id}__${index}`
              return (
                <FormControlLabel
                  key={uniqueValue}
                  value={uniqueValue}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {match.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        שורה {match.rowIndex} | מ.ז: {match.id} | סכום: {match.amount?.toLocaleString('he-IL')} ₪
                      </Typography>
                    </Box>
                  }
                />
              )
            })}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>ביטול</Button>
        <Button 
          onClick={handleResolve} 
          variant="contained" 
          disabled={!selectedCategory}
          sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
        >
          אישור
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConflictResolutionModal

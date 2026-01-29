import React, { useMemo, useState } from 'react'
import {
  buildSupportIdentifiers,
  formatDateDisplay,
  normalizeIdentifier,
  normalizeString,
} from '../../utils/maorotUtils'
import { useAuth } from '../../context/AuthContext'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import { styled } from '@mui/material/styles'

const StyledTableRow = styled(TableRow)(({ theme, selected }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: selected ? 'rgba(59, 130, 246, 0.1)' : theme.palette.action.hover,
  },
  '&:nth-of-type(even)': {
    backgroundColor: selected ? 'rgba(59, 130, 246, 0.1)' : theme.palette.background.paper,
  },
  '&:hover': {
    backgroundColor: selected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.04)',
  },
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
}))

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 500,
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  '& .MuiTableCell-root': {
    fontWeight: 700,
    color: theme.palette.grey[800],
    borderBottom: `2px solid ${theme.palette.primary.main}`,
  },
}))

const MovementsBoardTab = ({ 
  returnFileRows = [], 
  supports = [], 
  supportsHeaders = [],
  onSupportsChange,
  onReturnFileRowsChange
}) => {
  const { currentUser } = useAuth()
  const isAdmin = currentUser && currentUser.role === 'admin'
  
  const [filterName, setFilterName] = useState('')
  const [filterIdNumber, setFilterIdNumber] = useState('')
  const [filterAmount, setFilterAmount] = useState('')
  const [filterFrame, setFilterFrame] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [editCategory, setEditCategory] = useState('')
  const [editFrame, setEditFrame] = useState('')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [rowsToDelete, setRowsToDelete] = useState(new Set())

  const rows = useMemo(() => {
    if (!returnFileRows.length) return []
    const supportLookup = new Map()
    supports.forEach((support, index) => {
      const identifiers = buildSupportIdentifiers(support, supportsHeaders)
      identifiers.forEach((id) => {
        if (id) supportLookup.set(id, { support, index })
      })
    })

    return returnFileRows.map((row, rowIndex) => {
      const idCandidates = [
        normalizeIdentifier(row.idNumber),
        normalizeIdentifier(row.generalSupplierNumber),
        normalizeIdentifier(row.maorotSupplierNumber),
      ].filter(Boolean)

      let supportMatch = null
      let supportIndex = -1
      for (const id of idCandidates) {
        if (supportLookup.has(id)) {
          const match = supportLookup.get(id)
          supportMatch = match.support
          supportIndex = match.index
          break
        }
      }

      const rawRow = supportMatch?.rawRow || []
      const categoryIndex = supportsHeaders.findIndex((header) =>
        normalizeString(header).includes('קטגוריה')
      )
      const frameIndex = supportsHeaders.findIndex((header) =>
        normalizeString(header).includes('מסגרת')
      )

      const categoryValue =
        categoryIndex >= 0 && rawRow[categoryIndex]
          ? normalizeString(rawRow[categoryIndex])
          : 'לא סווג'
      const frameValue =
        frameIndex >= 0 && rawRow[frameIndex]
          ? normalizeString(rawRow[frameIndex])
          : 'לא סווג'

      return {
        id: `${row.idNumber}-${rowIndex}`,
        rowIndex,
        originalRowIndex: rowIndex, // שמירת האינדקס המקורי
        idNumber: row.idNumber || '',
        generalSupplierNumber: row.generalSupplierNumber || '',
        maorotSupplierNumber: row.maorotSupplierNumber || '',
        name: row.name || '',
        date: formatDateDisplay(row.date),
        amount: row.amount ?? '',
        category: categoryValue,
        frame: frameValue,
        supportMatch,
        supportIndex,
        categoryIndex,
        frameIndex,
        originalRow: row, // שמירת השורה המקורית למחיקה
      }
    })
  }, [returnFileRows, supports, supportsHeaders])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterName && !normalizeString(row.name).includes(normalizeString(filterName))) {
        return false
      }
      if (filterIdNumber && !normalizeString(row.idNumber).includes(normalizeString(filterIdNumber))) {
        return false
      }
      if (filterAmount) {
        const rowAmount = String(row.amount || '').replace(/[^\d.-]/g, '')
        const filterAmountNum = filterAmount.replace(/[^\d.-]/g, '')
        if (!rowAmount.includes(filterAmountNum)) {
          return false
        }
      }
      if (filterFrame && !normalizeString(row.frame).includes(normalizeString(filterFrame))) {
        return false
      }
      return true
    })
  }, [rows, filterName, filterIdNumber, filterAmount, filterFrame])

  const handleSelectRow = (rowId) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRows.map((row) => row.id)))
    }
  }

  const handleEditSelected = () => {
    if (selectedRows.size === 0) {
      alert('אנא בחר שורות לעריכה')
      return
    }
    setShowEditDialog(true)
    setEditCategory('')
    setEditFrame('')
  }

  const handleSaveEdit = () => {
    if (selectedRows.size === 0) return

    const updatedSupports = [...supports]
    let hasChanges = false

    filteredRows.forEach((row) => {
      if (!selectedRows.has(row.id)) return
      if (row.supportIndex === -1 || !row.supportMatch) return

      const support = updatedSupports[row.supportIndex]
      if (!support || !Array.isArray(support.rawRow)) return

      const newRawRow = [...support.rawRow]
      let changed = false

      if (editCategory && row.categoryIndex >= 0) {
        newRawRow[row.categoryIndex] = editCategory
        changed = true
      }
      if (editFrame && row.frameIndex >= 0) {
        newRawRow[row.frameIndex] = editFrame
        changed = true
      }

      if (changed) {
        updatedSupports[row.supportIndex] = {
          ...support,
          rawRow: newRawRow,
        }
        hasChanges = true
      }
    })

    if (hasChanges && onSupportsChange) {
      onSupportsChange(updatedSupports)
    }

    setShowEditDialog(false)
    setSelectedRows(new Set())
    setEditCategory('')
    setEditFrame('')
  }

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      alert('אנא בחר שורות למחיקה')
      return
    }
    setRowsToDelete(selectedRows)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (rowsToDelete.size === 0 || !onReturnFileRowsChange) return

    // יצירת רשימה חדשה ללא השורות שנמחקו
    const rowsToDeleteIndices = new Set()
    rows.forEach((row) => {
      if (rowsToDelete.has(row.id)) {
        rowsToDeleteIndices.add(row.originalRowIndex)
      }
    })

    const updatedReturnFileRows = returnFileRows.filter((_, index) => !rowsToDeleteIndices.has(index))
    onReturnFileRowsChange(updatedReturnFileRows)

    setShowDeleteDialog(false)
    setRowsToDelete(new Set())
    setSelectedRows(new Set())
  }

  const clearFilters = () => {
    setFilterName('')
    setFilterIdNumber('')
    setFilterAmount('')
    setFilterFrame('')
  }

  const hasActiveFilters = filterName || filterIdNumber || filterAmount || filterFrame

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)', minHeight: '100vh' }}>
      {/* כותרת */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1
          }}
        >
          לוח תנועות
        </Typography>
        <Typography variant="body2" color="text.secondary">
          מציג את הקובץ החוזר לאחר שמירה, עם סנכרון קטגוריה ומסגרת מניהול תמיכות
        </Typography>
      </Box>

      {rows.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            אין נתונים להצגה
          </Typography>
          <Typography variant="body2" color="text.secondary">
            יש להעלות קובץ חוזר וללחוץ על "שמור נתונים"
          </Typography>
        </Paper>
      ) : (
        <>
          {/* סרגל סינון */}
          <Paper 
            elevation={8} 
            sx={{ 
              p: 3, 
              mb: 3, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                סינון נתונים
              </Typography>
              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={clearFilters}
                  sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                  startIcon={<ClearIcon />}
                >
                  נקה סינונים
                </Button>
              )}
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="סינון לפי שם..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.8)',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="סינון לפי מ.ז..."
                  value={filterIdNumber}
                  onChange={(e) => setFilterIdNumber(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.8)',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="סינון לפי סכום..."
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.8)',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="סינון לפי מסגרת..."
                  value={filterFrame}
                  onChange={(e) => setFilterFrame(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.95)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.8)',
                      },
                    },
                  }}
                />
              </Grid>
            </Grid>
            
            {/* סרגל פעולות */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedRows.size > 0 && (
                  <Chip 
                    label={`${selectedRows.size} שורות נבחרו`}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                )}
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  סה"כ {filteredRows.length} שורות
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectAll}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  {selectedRows.size === filteredRows.length ? 'בטל בחירה' : 'בחר הכל'}
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleEditSelected}
                      disabled={selectedRows.size === 0}
                      startIcon={<EditIcon />}
                      sx={{
                        bgcolor: 'white',
                        color: '#667eea',
                        fontWeight: 700,
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.9)',
                        },
                        '&:disabled': {
                          bgcolor: 'rgba(255,255,255,0.3)',
                          color: 'rgba(255,255,255,0.5)',
                        },
                      }}
                    >
                      ערוך נבחרים ({selectedRows.size})
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleDeleteSelected}
                      disabled={selectedRows.size === 0}
                      startIcon={<DeleteIcon />}
                      sx={{
                        bgcolor: '#ef4444',
                        color: 'white',
                        fontWeight: 700,
                        '&:hover': {
                          bgcolor: '#dc2626',
                        },
                        '&:disabled': {
                          bgcolor: 'rgba(239,68,68,0.3)',
                          color: 'rgba(255,255,255,0.5)',
                        },
                      }}
                    >
                      מחק נבחרים ({selectedRows.size})
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* טבלה */}
          <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader sx={{ minWidth: 1200 }}>
                <StyledTableHead>
                  <TableRow>
                    <StyledTableCell padding="checkbox" sx={{ width: 50 }}>
                      <Checkbox
                        checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                        indeterminate={selectedRows.size > 0 && selectedRows.size < filteredRows.length}
                        onChange={handleSelectAll}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': {
                            color: '#667eea',
                          },
                        }}
                      />
                    </StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>מ.ז</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>מס' ספק כולל</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>מס' ספק מאורות</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>שם</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>תאריך</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }} align="right">סכום</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>קטגוריה</StyledTableCell>
                    <StyledTableCell sx={{ fontWeight: 700 }}>מסגרת</StyledTableCell>
                    {isAdmin && (
                      <StyledTableCell sx={{ fontWeight: 700, width: 80 }}>פעולות</StyledTableCell>
                    )}
                  </TableRow>
                </StyledTableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          לא נמצאו שורות התואמות לסינון
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <StyledTableRow
                        key={row.id}
                        selected={selectedRows.has(row.id)}
                        onClick={() => handleSelectRow(row.id)}
                      >
                        <StyledTableCell padding="checkbox">
                          <Checkbox
                            checked={selectedRows.has(row.id)}
                            onChange={() => handleSelectRow(row.id)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              color: '#667eea',
                              '&.Mui-checked': {
                                color: '#667eea',
                              },
                            }}
                          />
                        </StyledTableCell>
                        <StyledTableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.idNumber || '-'}
                        </StyledTableCell>
                        <StyledTableCell sx={{ fontFamily: 'monospace' }}>
                          {row.generalSupplierNumber || '-'}
                        </StyledTableCell>
                        <StyledTableCell sx={{ fontFamily: 'monospace' }}>
                          {row.maorotSupplierNumber || '-'}
                        </StyledTableCell>
                        <StyledTableCell sx={{ fontWeight: 600 }}>
                          {row.name || '-'}
                        </StyledTableCell>
                        <StyledTableCell>{row.date || '-'}</StyledTableCell>
                        <StyledTableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                          {typeof row.amount === 'number' 
                            ? row.amount.toLocaleString('he-IL') + ' ₪'
                            : row.amount || '-'}
                        </StyledTableCell>
                        <StyledTableCell>
                          <Chip 
                            label={row.category} 
                            size="small"
                            sx={{
                              bgcolor: row.category === 'לא סווג' ? '#fef3c7' : '#dbeafe',
                              color: row.category === 'לא סווג' ? '#92400e' : '#1e40af',
                              fontWeight: 600,
                            }}
                          />
                        </StyledTableCell>
                        <StyledTableCell>
                          <Chip 
                            label={row.frame} 
                            size="small"
                            sx={{
                              bgcolor: row.frame === 'לא סווג' ? '#fef3c7' : '#e0e7ff',
                              color: row.frame === 'לא סווג' ? '#92400e' : '#3730a3',
                              fontWeight: 600,
                            }}
                          />
                        </StyledTableCell>
                        {isAdmin && (
                          <StyledTableCell>
                            <Tooltip title="מחק תנועה">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRowsToDelete(new Set([row.id]))
                                  setShowDeleteDialog(true)
                                }}
                                sx={{
                                  '&:hover': {
                                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </StyledTableCell>
                        )}
                      </StyledTableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* דיאלוג עריכה */}
          <Dialog 
            open={showEditDialog} 
            onClose={() => {
              setShowEditDialog(false)
              setEditCategory('')
              setEditFrame('')
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 700,
              pb: 2
            }}>
              ערוך {selectedRows.size} שורות
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                הזן ערכים חדשים לקטגוריה ו/או מסגרת. השאר ריק כדי לא לשנות את הערך הקיים.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="קטגוריה"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="הזן קטגוריה חדשה..."
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="מסגרת"
                  value={editFrame}
                  onChange={(e) => setEditFrame(e.target.value)}
                  placeholder="הזן מסגרת חדשה..."
                  variant="outlined"
                />
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button
                onClick={() => {
                  setShowEditDialog(false)
                  setEditCategory('')
                  setEditFrame('')
                }}
                sx={{ color: 'text.secondary' }}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveEdit}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                  fontWeight: 700,
                }}
              >
                שמור שינויים
              </Button>
            </DialogActions>
          </Dialog>

          {/* דיאלוג מחיקה */}
          <Dialog 
            open={showDeleteDialog} 
            onClose={() => {
              setShowDeleteDialog(false)
              setRowsToDelete(new Set())
            }}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              fontWeight: 700,
              pb: 2
            }}>
              מחיקת תנועות
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <DialogContentText sx={{ mb: 2, fontSize: '1rem' }}>
                האם אתה בטוח שברצונך למחוק {rowsToDelete.size} תנועות?
              </DialogContentText>
              <DialogContentText sx={{ color: 'error.main', fontWeight: 600 }}>
                פעולה זו אינה ניתנת לביטול!
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setRowsToDelete(new Set())
                }}
                sx={{ color: 'text.secondary' }}
              >
                ביטול
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="contained"
                sx={{
                  bgcolor: '#ef4444',
                  '&:hover': {
                    bgcolor: '#dc2626',
                  },
                  fontWeight: 700,
                }}
              >
                מחק
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}

export default MovementsBoardTab

import React, { useState, useRef } from 'react'
import { exportToExcel } from '../services/exportUtils'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import { createWorker } from 'tesseract.js'

const IDExtractionPage = () => {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extractedData, setExtractedData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setImage(file)
        setError('')
        
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setPreview(reader.result)
          }
          reader.readAsDataURL(file)
        } else {
          setPreview('/pdf-icon.png') // Placeholder for PDF
        }
      } else {
        setError('אנא העלה קובץ תמונה (JPG, PNG) או PDF')
      }
    }
  }

  // פונקציה לחילוץ מספר זהות מתאריך ישראלי
  const extractIDFromText = (text) => {
    // מחפש מספר זהות ישראלי (9 ספרות)
    const idMatch = text.match(/\b\d{9}\b/g)
    return idMatch ? idMatch[0] : null
  }

  // פונקציה לחילוץ תאריך לידה
  const extractBirthDate = (text) => {
    // מחפש תאריכים בפורמט DD/MM/YYYY או DD.MM.YYYY
    const datePattern = /\b(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})\b/g
    const matches = text.match(datePattern)
    if (matches && matches.length > 0) {
      // מחזיר את התאריך הראשון שנמצא (בדרך כלל תאריך הלידה)
      return matches[0]
    }
    return null
  }

  // פונקציה לחילוץ שם (בעברית)
  const extractHebrewName = (text) => {
    // מחפש מילים בעברית (אותיות עבריות)
    const hebrewPattern = /[\u0590-\u05FF]{2,}(?:\s+[\u0590-\u05FF]{2,})*/g
    const matches = text.match(hebrewPattern)
    if (matches && matches.length > 0) {
      // מחזיר את המילה הראשונה או שתי המילים הראשונות
      return matches.slice(0, 2).join(' ')
    }
    return null
  }

  // פונקציה לחילוץ שם באנגלית
  const extractEnglishName = (text) => {
    // מחפש מילים באנגלית (אותיות לטיניות)
    const englishPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    const matches = text.match(englishPattern)
    if (matches && matches.length > 0) {
      return matches.slice(0, 2).join(' ')
    }
    return null
  }

  const handleExtract = async () => {
    if (!image) {
      setError('אנא העלה תמונה או PDF')
      return
    }

    setLoading(true)
    setProcessing(true)
    setError('')
    setExtractedData([])

    try {
      let imageData = null

      // אם זה PDF, נמיר אותו לתמונה ואז נעשה OCR
      let imageUrl = null
      if (image.type === 'application/pdf') {
        try {
          // טעינת pdfjs-dist דינמית
          const pdfjsLib = await import('pdfjs-dist')
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
          
          const arrayBuffer = await image.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          
          // קורא את העמוד הראשון
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 2.0 })
          
          // יוצר canvas לעמוד
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          // מצייר את העמוד על ה-canvas
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise
          
          // ממיר את ה-canvas לתמונה
          imageUrl = canvas.toDataURL('image/png')
        } catch (pdfError) {
          console.error('Error processing PDF:', pdfError)
          setError(`שגיאה בעיבוד PDF: ${pdfError.message}. אנא נסה קובץ אחר או העלה תמונה.`)
          setLoading(false)
          setProcessing(false)
          return
        }
      } else {
        // אם זה תמונה, משתמשים ב-URL ישירות
        imageUrl = URL.createObjectURL(image)
      }

      // יצירת worker ל-OCR
      const worker = await createWorker('heb+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      // ביצוע OCR
      const { data: { text } } = await worker.recognize(imageUrl)
      
      await worker.terminate()
      
      // שחרור ה-URL רק אם זה לא PDF (כי PDF כבר לא צריך)
      if (image.type !== 'application/pdf' && imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }

      console.log('OCR Text:', text)

      // חילוץ הנתונים מהטקסט
      const idNumber = extractIDFromText(text)
      const birthDate = extractBirthDate(text)
      const hebrewName = extractHebrewName(text)
      const englishName = extractEnglishName(text)

      // אם לא נמצאו נתונים, נציג הודעה
      if (!idNumber && !birthDate && !hebrewName) {
        setError('לא נמצאו נתונים בתמונה. אנא וודא שהתמונה ברורה וקריאה.')
        setLoading(false)
        setProcessing(false)
        return
      }

      // יצירת רשומה חדשה
      const newRecord = {
        id: Date.now(),
        name: hebrewName || englishName || '',
        nameEnglish: englishName || '',
        idNumber: idNumber || '',
        birthDate: birthDate || '',
        rawText: text // שמירת הטקסט הגולמי לעריכה
      }

      setExtractedData([...extractedData, newRecord])
      setPreview(null)
      setImage(null)
      
      // איפוס input file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('Error extracting data:', err)
      setError(`שגיאה בחילוץ הנתונים: ${err.message}`)
    } finally {
      setLoading(false)
      setProcessing(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setImage(file)
      setError('')
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result)
        }
        reader.readAsDataURL(file)
      }
    } else {
      setError('אנא העלה קובץ תמונה (JPG, PNG) או PDF')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDelete = (id) => {
    setExtractedData(extractedData.filter(item => item.id !== id))
  }

  const handleDownload = () => {
    if (extractedData.length === 0) {
      setError('אין נתונים להורדה')
      return
    }

    const dataToExport = extractedData.map(item => ({
      'שם': item.name || '',
      'שם באנגלית': item.nameEnglish || '',
      'מספר זהות': item.idNumber || '',
      'תאריך לידה': item.birthDate || ''
    }))

    const dateStr = new Date().toISOString().split('T')[0]
    exportToExcel(dataToExport, 'חילוץ תעודת זהות', `חילוץ_תעודת_זהות_${dateStr}.xlsx`)
  }

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)', minHeight: '100vh' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: 4, 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        חילוץ מתעודת זהות
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          העלה תמונה או PDF של ספח תעודת זהות לחילוץ אוטומטי של: שמות, מספרי זהות ותאריכי לידה
        </Typography>

        {/* Upload Area */}
        <Paper
          elevation={2}
          sx={{
            border: '2px dashed',
            borderColor: preview ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: preview ? 'action.hover' : 'background.paper',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          
          {preview ? (
            <Box>
              {image?.type?.startsWith('image/') ? (
                <Box
                  component="img"
                  src={preview}
                  alt="Preview"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: 2,
                    mb: 2,
                    boxShadow: 2
                  }}
                />
              ) : (
                <Box sx={{ py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    קובץ PDF: {image?.name}
                  </Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                color="error"
                onClick={(e) => {
                  e.stopPropagation()
                  setImage(null)
                  setPreview(null)
                  setError('')
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                sx={{ mt: 2 }}
              >
                הסר קובץ
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ margin: '0 auto', color: '#667eea' }}
                >
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                לחץ להעלאת תמונה או PDF
              </Typography>
              <Typography variant="body2" color="text.secondary">
                או גרור ושחרר קובץ כאן
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                PNG, JPG, PDF עד 10MB
              </Typography>
            </>
          )}
        </Paper>

        {/* Extract Button */}
        {image && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleExtract}
              disabled={loading || processing}
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                }
              }}
            >
              {loading || processing ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                  מעבד תמונה...
                </>
              ) : (
                'חלץ נתונים מתעודת זהות'
              )}
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {processing && (
          <Alert severity="info" sx={{ mt: 2 }}>
            מנתח תמונה... זה עלול לקחת מספר שניות
          </Alert>
        )}
      </Paper>

      {/* Results Table */}
      {extractedData.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
              נתונים שחולצו ({extractedData.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                }
              }}
            >
              הורד Excel
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>שם</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>שם באנגלית</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>מספר זהות</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>תאריך לידה</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {extractedData.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.name || '-'}</TableCell>
                    <TableCell>{item.nameEnglish || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.idNumber || '-'}
                    </TableCell>
                    <TableCell>{item.birthDate || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="מחק">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  )
}

export default IDExtractionPage

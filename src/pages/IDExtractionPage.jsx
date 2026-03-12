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
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import { createWorker } from 'tesseract.js'

const StatCard = ({ title, value, subtitle, accent, icon }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      borderRadius: 5,
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent.main,
          backgroundColor: accent.soft,
          border: `1px solid ${accent.border}`,
        }}
      >
        {icon}
      </Box>
      <Box
        sx={{
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          color: accent.main,
          backgroundColor: accent.soft,
        }}
      >
        OCR
      </Box>
    </Box>
    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#334155', mb: 0.5 }}>
      {title}
    </Typography>
    <Typography sx={{ fontSize: 12, color: '#64748b' }}>
      {subtitle}
    </Typography>
  </Paper>
)

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

  const stats = [
    {
      title: 'קובץ פעיל',
      value: image ? image.name : 'עדיין לא נבחר',
      subtitle: image ? 'הקובץ מוכן לעיבוד OCR' : 'העלה תמונה או PDF כדי להתחיל',
      accent: { main: '#0f766e', soft: '#ccfbf1', border: '#99f6e4' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6.69a1.5 1.5 0 011.06.44l3.06 3.06a1.5 1.5 0 01.44 1.06v10.44a1.5 1.5 0 01-1.5 1.5H7.5a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
        </svg>
      ),
    },
    {
      title: 'רשומות שחולצו',
      value: `${extractedData.length}`,
      subtitle: 'כמות הרשומות שמוכנות לייצוא',
      accent: { main: '#1d4ed8', soft: '#dbeafe', border: '#bfdbfe' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h9m-9 4.5h9m-9 4.5H12m7.5-10.5h-15A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h15a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0019.5 6z" />
        </svg>
      ),
    },
    {
      title: 'מצב עיבוד',
      value: processing ? 'מעבד כעת' : 'מוכן לעבודה',
      subtitle: processing ? 'המערכת מפענחת את הקובץ ברקע' : 'אפשר להעלות או להוריד נתונים',
      accent: { main: '#7c3aed', soft: '#f3e8ff', border: '#e9d5ff' },
      icon: (
        <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: '#f8fafc', minHeight: '100vh' }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          mb: 0.75,
          fontWeight: 800,
          color: '#0f172a',
        }}
      >
        חילוץ מתעודת זהות
      </Typography>
      <Typography sx={{ mb: 4, fontSize: 14, color: '#64748b' }}>
        העלאה, פענוח וייצוא של נתוני תעודת זהות בעיצוב חדש, ברור ונוח יותר לעבודה.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.title}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 4,
          borderRadius: 5,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              העלאת מסמך
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>
              העלה תמונה או PDF של ספח תעודת זהות לחילוץ אוטומטי של שמות, מספרי זהות ותאריכי לידה.
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            תמונות ו־PDF
          </Box>
        </Box>

        {/* Upload Area */}
        <Paper
          elevation={0}
          sx={{
            border: '2px dashed',
            borderColor: preview ? '#14b8a6' : '#cbd5e1',
            borderRadius: 5,
            p: { xs: 3, md: 5 },
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: preview ? 'linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            '&:hover': {
              borderColor: '#14b8a6',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 100%)',
            },
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
                    borderRadius: 4,
                    mb: 2,
                    boxShadow: '0 18px 34px rgba(15, 23, 42, 0.12)',
                  }}
                />
              ) : (
                <Box sx={{ py: 4 }}>
                  <Typography variant="h6" sx={{ color: '#334155', fontWeight: 700 }}>
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
                sx={{ mt: 2, borderRadius: 3, px: 3, fontWeight: 700 }}
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
                  style={{ margin: '0 auto', color: '#0f766e' }}
                >
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>
              <Typography variant="h6" sx={{ mb: 1, color: '#334155', fontWeight: 700 }}>
                לחץ להעלאת תמונה או PDF
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                או גרור ושחרר קובץ כאן
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94a3b8' }}>
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
                py: 1.6,
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 3.5,
                boxShadow: '0 12px 24px rgba(20, 184, 166, 0.22)',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
                },
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
          <Alert severity="error" sx={{ mt: 3, borderRadius: 4 }}>
            {error}
          </Alert>
        )}

        {processing && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 4 }}>
            מנתח תמונה... זה עלול לקחת מספר שניות
          </Alert>
        )}
      </Paper>

      {/* Results Table */}
      {extractedData.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 5,
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                נתונים שחולצו ({extractedData.length})
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                אפשר לעבור על הנתונים לפני הורדה ל־Excel
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{
                borderRadius: 3.5,
                fontWeight: 700,
                minHeight: 48,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 12px 24px rgba(37, 99, 235, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                },
              }}
            >
              הורד Excel
            </Button>
          </Box>

          <TableContainer
            sx={{
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>שם</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>שם באנגלית</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>מספר זהות</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>תאריך לידה</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569' }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {extractedData.map((item, index) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#fbfdff',
                      '& td': {
                        borderBottomColor: '#edf2f7',
                      },
                    }}
                  >
                    <TableCell>{item.name || '-'}</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{item.nameEnglish || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      {item.idNumber || '-'}
                    </TableCell>
                    <TableCell>{item.birthDate || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="מחק">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(item.id)}
                          sx={{
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff1f2',
                            '&:hover': {
                              backgroundColor: '#ffe4e6',
                            },
                          }}
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

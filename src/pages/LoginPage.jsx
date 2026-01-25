import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import { useAuth } from '../context/AuthContext'

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    try {
      login(username.trim(), password)
      const redirectTo = location.state?.from?.pathname || '/charity'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'שגיאה בהתחברות')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        p: 3,
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          כניסה למערכת
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          יש להתחבר עם שם משתמש וסיסמה כדי להמשיך
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="שם משתמש"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
          <TextField
            label="סיסמה"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ background: '#4caf50', '&:hover': { background: '#45a049' } }}
          >
            התחבר
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default LoginPage

import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useAuth } from '../context/AuthContext'

const AdminUsersPage = () => {
  const { users, addUser, updateUser, resetUserPassword, currentUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', role: 'user' })
  const [newPassword, setNewPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!username.trim() || !password || !firstName.trim() || !lastName.trim()) {
      setError('יש למלא שם משתמש, סיסמה, שם פרטי ושם משפחה')
      return
    }
    try {
      addUser({
        username: username.trim(),
        password,
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setSuccess('המשתמש נוצר בהצלחה')
      setUsername('')
      setPassword('')
      setFirstName('')
      setLastName('')
      setRole('user')
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת משתמש')
    }
  }

  const openEditDialog = (user) => {
    setError('')
    setSuccess('')
    setEditUser(user)
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      role: user.role || 'user',
    })
  }

  const closeEditDialog = () => {
    setEditUser(null)
  }

  const saveEditDialog = () => {
    if (!editUser) return
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.username.trim()) {
      setError('יש למלא שם פרטי, שם משפחה ושם משתמש')
      return
    }
    try {
      updateUser(editUser.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        username: editForm.username.trim(),
        role: editForm.role,
      })
      setSuccess('המשתמש עודכן בהצלחה')
      setError('')
      setEditUser(null)
    } catch (err) {
      setError(err.message || 'שגיאה בעדכון משתמש')
    }
  }

  const openResetDialog = (user) => {
    setError('')
    setSuccess('')
    setResetUser(user)
    setNewPassword('')
  }

  const closeResetDialog = () => {
    setResetUser(null)
    setNewPassword('')
  }

  const saveResetDialog = () => {
    if (!resetUser) return
    if (!newPassword) {
      setError('יש להזין סיסמה חדשה')
      return
    }
    try {
      resetUserPassword(resetUser.id, newPassword)
      setSuccess('הסיסמה עודכנה בהצלחה')
      setError('')
      setResetUser(null)
      setNewPassword('')
    } catch (err) {
      setError(err.message || 'שגיאה באיפוס סיסמה')
    }
  }

  const toggleUserActive = (user) => {
    if (currentUser?.id === user.id) {
      setError('לא ניתן לחסום את המשתמש המחובר')
      return
    }
    try {
      updateUser(user.id, { active: !user.active })
      setSuccess(user.active ? 'המשתמש נחסם' : 'המשתמש הופעל')
      setError('')
    } catch (err) {
      setError(err.message || 'שגיאה בעדכון סטטוס משתמש')
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#2e7d32' }}>
        ניהול משתמשים
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          פתיחת גישה למשתמש חדש
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2, maxWidth: 420 }}>
          <TextField
            label="שם פרטי"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
          <TextField
            label="שם משפחה"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
          <TextField
            label="שם משתמש"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <TextField
            label="סיסמה"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <FormControl>
            <InputLabel>תפקיד</InputLabel>
            <Select value={role} label="תפקיד" onChange={(event) => setRole(event.target.value)}>
              <MenuItem value="user">משתמש</MenuItem>
              <MenuItem value="admin">מנהל</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" sx={{ background: '#4caf50' }}>
            צור משתמש
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          משתמשים קיימים
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>שם מלא</strong></TableCell>
                <TableCell><strong>שם משתמש</strong></TableCell>
                <TableCell><strong>תפקיד</strong></TableCell>
                <TableCell><strong>סטטוס</strong></TableCell>
                <TableCell><strong>פעולות</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id || user.username}>
                  <TableCell>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.role === 'admin' ? 'מנהל' : 'משתמש'}</TableCell>
                  <TableCell>{user.active ? 'פעיל' : 'חסום'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(user)}>
                        עריכה
                      </Button>
                      <Button size="small" variant="outlined" color="warning" onClick={() => openResetDialog(user)}>
                        איפוס סיסמה
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={user.active ? 'error' : 'success'}
                        onClick={() => toggleUserActive(user)}
                      >
                        {user.active ? 'חסום' : 'הפעל'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={Boolean(editUser)} onClose={closeEditDialog} maxWidth="xs" fullWidth>
        <DialogTitle>עריכת משתמש</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <TextField
            label="שם פרטי"
            value={editForm.firstName}
            onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })}
            required
          />
          <TextField
            label="שם משפחה"
            value={editForm.lastName}
            onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })}
            required
          />
          <TextField
            label="שם משתמש"
            value={editForm.username}
            onChange={(event) => setEditForm({ ...editForm, username: event.target.value })}
            required
          />
          <FormControl>
            <InputLabel>תפקיד</InputLabel>
            <Select
              value={editForm.role}
              label="תפקיד"
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}
            >
              <MenuItem value="user">משתמש</MenuItem>
              <MenuItem value="admin">מנהל</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>ביטול</Button>
          <Button variant="contained" onClick={saveEditDialog}>
            שמירה
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetUser)} onClose={closeResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle>איפוס סיסמה</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            הזן סיסמה חדשה עבור המשתמש {resetUser?.username}
          </Typography>
          <TextField
            label="סיסמה חדשה"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResetDialog}>ביטול</Button>
          <Button variant="contained" color="warning" onClick={saveResetDialog}>
            עדכן סיסמה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminUsersPage

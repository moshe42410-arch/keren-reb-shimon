const USERS_KEY = 'ht_users_v1'
const CURRENT_USER_KEY = 'ht_current_user_v1'

const defaultAdmin = {
  id: 'admin-1',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  firstName: 'מנהל',
  lastName: 'מערכת',
  createdAt: new Date().toISOString(),
  active: true,
}

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const ensureAdminUser = () => {
  const users = readJSON(USERS_KEY, [])
  if (users.length === 0) {
    writeJSON(USERS_KEY, [defaultAdmin])
    return [defaultAdmin]
  }
  return users
}

export const getUsers = () => readJSON(USERS_KEY, [])

export const getCurrentUser = () => {
  const stored = readJSON(CURRENT_USER_KEY, null)
  if (!stored) return null
  const users = getUsers()
  const found = users.find((user) => user.username === stored.username)
  return found && found.active ? found : null
}

export const login = (username, password) => {
  const users = getUsers()
  const user = users.find(
    (candidate) =>
      candidate.username === username &&
      candidate.password === password &&
      candidate.active
  )
  if (!user) {
    throw new Error('שם משתמש או סיסמה שגויים')
  }
  writeJSON(CURRENT_USER_KEY, { username: user.username })
  return user
}

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export const addUser = (currentUser, { username, password, role, firstName, lastName }) => {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('אין הרשאה ליצור משתמשים')
  }
  const users = getUsers()
  if (users.some((user) => user.username === username)) {
    throw new Error('שם משתמש כבר קיים')
  }
  const newUser = {
    id: `user-${Date.now()}`,
    username,
    password,
    role,
    firstName,
    lastName,
    createdAt: new Date().toISOString(),
    active: true,
  }
  const updated = [...users, newUser]
  writeJSON(USERS_KEY, updated)
  return newUser
}

export const updateUser = (currentUser, userId, updates) => {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('אין הרשאה לעדכון משתמשים')
  }
  const users = getUsers()
  if (updates.username) {
    const duplicate = users.find(
      (user) => user.username === updates.username && user.id !== userId
    )
    if (duplicate) {
      throw new Error('שם משתמש כבר קיים')
    }
  }
  const updatedUsers = users.map((user) => {
    if (user.id !== userId) return user
    return {
      ...user,
      username: updates.username ?? user.username,
      role: updates.role ?? user.role,
      firstName: updates.firstName ?? user.firstName,
      lastName: updates.lastName ?? user.lastName,
      active: typeof updates.active === 'boolean' ? updates.active : user.active,
    }
  })
  writeJSON(USERS_KEY, updatedUsers)
  return updatedUsers.find((user) => user.id === userId)
}

export const resetUserPassword = (currentUser, userId, newPassword) => {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('אין הרשאה לאיפוס סיסמה')
  }
  if (!newPassword) {
    throw new Error('יש להזין סיסמה חדשה')
  }
  const users = getUsers()
  const updatedUsers = users.map((user) => {
    if (user.id !== userId) return user
    return {
      ...user,
      password: newPassword,
    }
  })
  writeJSON(USERS_KEY, updatedUsers)
  return updatedUsers.find((user) => user.id === userId)
}

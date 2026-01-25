import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  addUser as addUserService,
  ensureAdminUser,
  getCurrentUser,
  getUsers,
  login as loginService,
  logout as logoutService,
  resetUserPassword as resetUserPasswordService,
  updateUser as updateUserService,
} from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])

  useEffect(() => {
    const seeded = ensureAdminUser()
    setUsers(seeded)
    setCurrentUser(getCurrentUser())
  }, [])

  const login = (username, password) => {
    const user = loginService(username, password)
    setCurrentUser(user)
    return user
  }

  const logout = () => {
    logoutService()
    setCurrentUser(null)
  }

  const refreshUsers = () => {
    setUsers(getUsers())
  }

  const addUser = (payload) => {
    const newUser = addUserService(currentUser, payload)
    refreshUsers()
    return newUser
  }

  const updateUser = (userId, updates) => {
    const updated = updateUserService(currentUser, userId, updates)
    refreshUsers()
    return updated
  }

  const resetUserPassword = (userId, newPassword) => {
    const updated = resetUserPasswordService(currentUser, userId, newPassword)
    refreshUsers()
    return updated
  }

  const value = useMemo(
    () => ({
      currentUser,
      users,
      isAuthenticated: Boolean(currentUser),
      login,
      logout,
      addUser,
      updateUser,
      resetUserPassword,
      refreshUsers,
    }),
    [currentUser, users]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

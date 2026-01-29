import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import TopNavigation from './components/layout/TopNavigation'
import Sidebar from './components/layout/Sidebar'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import UploadPage from './pages/UploadPage'
import SummariesPage from './pages/SummariesPage'
import ReportsPage from './pages/ReportsPage'
import IDExtractionPage from './pages/IDExtractionPage'
import FundsManagementPage from './pages/FundsManagementPage'
import MaorotPage from './pages/MaorotPage'
import UnifiedSummariesPage from './pages/UnifiedSummariesPage'
import LoginPage from './pages/LoginPage'
import AdminUsersPage from './pages/AdminUsersPage'
import SupportFormPage from './pages/SupportFormPage'

const AppRoutes = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const showNavigation = isAuthenticated && location.pathname !== '/login'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100" style={{ backgroundColor: '#f8fafc' }}>
      {showNavigation && <TopNavigation />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Charity routes with sidebar */}
        <Route
          path="/charity/*"
          element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6">
                  <Routes>
                    <Route path="upload" element={<UploadPage />} />
                    <Route path="summaries" element={<SummariesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="id-extraction" element={<IDExtractionPage />} />
                    <Route path="funds-management" element={<FundsManagementPage />} />
                    <Route
                      path="users"
                      element={
                        <AdminRoute>
                          <AdminUsersPage />
                        </AdminRoute>
                      }
                    />
                    <Route index element={<Navigate to="/charity/upload" replace />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Maorot route */}
        <Route
          path="/maorot"
          element={
            <ProtectedRoute>
              <MaorotPage />
            </ProtectedRoute>
          }
        />

        {/* Unified summaries route */}
        <Route
          path="/summaries"
          element={
            <ProtectedRoute>
              <UnifiedSummariesPage />
            </ProtectedRoute>
          }
        />

        {/* Support form route - no authentication required */}
        <Route path="/support-form" element={<SupportFormPage />} />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? '/charity/upload' : '/login'} replace />
          }
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  )
}

export default App

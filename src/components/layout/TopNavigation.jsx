import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const TopNavigation = () => {
  const location = useLocation()
  const [charityLogoError, setCharityLogoError] = useState(false)
  const { currentUser, logout } = useAuth()

  const getInitials = () => {
    const first = currentUser?.firstName?.trim()
    const last = currentUser?.lastName?.trim()
    if (first || last) {
      return `${first ? first[0] : ''}${last ? last[0] : ''}`.toUpperCase()
    }
    return currentUser?.username?.slice(0, 2)?.toUpperCase() || ''
  }
  
  const tabs = [
    { 
      name: 'מרכז הצדקה', 
      path: '/charity',
      useImage: true,
      imageSrc: '/לוגו מרכז הצדקה.jpeg',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      )
    },
    { 
      name: 'מאורות', 
      path: '/maorot',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      )
    },
    { 
      name: 'סיכומים', 
      path: '/summaries',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-18 6h18m-18 6h18" />
        </svg>
      )
    },
  ]

  const isActive = (path) => {
    if (path === '/charity') {
      return location.pathname.startsWith('/charity')
    }
    return location.pathname === path
  }

  const handleLogoClick = () => {
    // רענון מלא (Hard Refresh) לדף הבית
    window.location.href = '/'
  }

  return (
    <nav className="bg-white/70 shadow-lg border-b border-white/60 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-[90rem] mx-auto px-8 sm:px-10 lg:px-12">
        <div className="flex justify-between items-center h-24">
          {/* Logo בצד שמאל - עם פונקציונליות רענון */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded-md p-1"
              aria-label="רענון לדף הבית"
            >
              <img
                src="/לוגו.png"
                alt="לוגו"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </button>
          </div>

          {/* Tabs באמצע - עיצוב פיננסי מודרני */}
          <div className="flex space-x-4 space-x-reverse mt-2">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`
                  relative flex items-center gap-2 px-7 py-3.5 text-lg font-semibold rounded-xl
                  transition-all duration-300 ease-in-out
                  ${
                    isActive(tab.path)
                      ? 'bg-gradient-to-r from-blue-50 to-green-50 text-blue-700 shadow-md border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                  }
                  ${!isActive(tab.path) && 'hover:scale-[1.02]'}
                `}
              >
                {tab.useImage && !charityLogoError ? (
                  <img 
                    src={tab.imageSrc} 
                    alt={tab.name} 
                    className="w-5 h-5 object-contain rounded"
                    onError={() => {
                      setCharityLogoError(true)
                    }}
                  />
                ) : (
                  <span className={`transition-transform duration-300 ${isActive(tab.path) ? 'text-blue-600' : 'text-gray-500'}`}>
                    {tab.icon}
                  </span>
                )}
                <span className="font-sans">{tab.name}</span>
                {isActive(tab.path) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-green-600 rounded-full"></span>
                )}
              </Link>
            ))}
          </div>

          {/* Finance בצד ימין - עיצוב יוקרתי בנקאי מודרני */}
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span 
                className="text-[2.6rem] font-extrabold bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 bg-clip-text text-transparent"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  lineHeight: '1.2'
                }}
              >
                FINANCE
              </span>
              <span className="text-sm text-gray-600 mt-0.5 font-medium" dir="rtl">
                תוכנה לניהול כספים
              </span>
            </div>
            {currentUser && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-800 blur-[6px] opacity-40" />
                  <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white shadow-lg ring-2 ring-white/80">
                    <span className="text-sm font-bold tracking-wide">{getInitials()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 shadow-md backdrop-blur">
                  <span className="text-sm font-semibold text-gray-800" dir="rtl">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500" dir="rtl">
                      {currentUser.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={logout}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      התנתק
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TopNavigation

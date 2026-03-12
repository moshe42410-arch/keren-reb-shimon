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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      )
    },
  ]

  const isActive = (path) => {
    if (path === '/charity') return location.pathname.startsWith('/charity')
    return location.pathname === path
  }

  const handleLogoClick = () => {
    window.location.href = '/'
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
      <div className="max-w-[90rem] mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo בצד שמאל */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 focus:outline-none rounded-md p-1"
              aria-label="רענון לדף הבית"
            >
              <img
                src="/לוגו.png"
                alt="לוגו"
                className="h-14 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </button>
          </div>

          {/* Tabs באמצע */}
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const active = isActive(tab.path)
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`
                    relative flex items-center gap-2.5 px-6 py-2.5 text-sm font-semibold rounded-xl
                    transition-all duration-200
                    ${active
                      ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/50'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }
                  `}
                >
                  {tab.useImage && !charityLogoError ? (
                    <img 
                      src={tab.imageSrc} 
                      alt={tab.name} 
                      className="w-5 h-5 object-contain rounded"
                      onError={() => setCharityLogoError(true)}
                    />
                  ) : (
                    <span className={active ? 'text-teal-600' : 'text-gray-400'}>
                      {tab.icon}
                    </span>
                  )}
                  <span>{tab.name}</span>
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-500 rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            {/* FINANCE Brand */}
            <div className="flex flex-col items-end">
              <span 
                className="text-2xl font-black tracking-wider"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FINANCE
              </span>
              <span className="text-[11px] text-gray-400 font-medium -mt-0.5" dir="rtl">
                תוכנה לניהול כספים
              </span>
            </div>

            {/* User */}
            {currentUser && (
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                  <span className="text-xs font-bold tracking-wide">{getInitials()}</span>
                </div>
                
                {/* Info */}
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-800" dir="rtl">
                    {`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400" dir="rtl">
                      {currentUser.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={logout}
                      className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors"
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

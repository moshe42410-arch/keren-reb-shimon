import React from 'react'

const MaorotSidebar = ({ tabs, activeTab, onTabChange }) => {
  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen border-l border-gray-200">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">מאורות</h2>
        <nav className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-right flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 border-r-4 border-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}

export default MaorotSidebar

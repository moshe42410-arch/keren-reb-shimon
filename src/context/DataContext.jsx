import React, { createContext, useContext, useState } from 'react'

export const useDataContext = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider')
  }
  return context
}

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

// ID קבוע של Google Sheets
const GOOGLE_SHEETS_ID = '1ObJQ9qkwggN8xE7WmFOWZWQOCTSMTwaP2l5QdNl51sY'

export const DataProvider = ({ children }) => {
  const [excelData, setExcelData] = useState(null)
  const [processedData, setProcessedData] = useState(null)
  const [categoriesData, setCategoriesData] = useState(null)
  const [selectedFund, setSelectedFund] = useState('')
  // משתמש ב-ID קבוע - לא מאפשר שינוי
  const googleSheetsId = GOOGLE_SHEETS_ID

  const updateExcelData = (data) => {
    setExcelData(data)
  }

  const updateProcessedData = (data) => {
    setProcessedData(data)
  }

  const updateCategoriesData = (data) => {
    setCategoriesData(data)
  }

  const updateSelectedFund = (fund) => {
    setSelectedFund(fund)
  }

  return (
    <DataContext.Provider
      value={{
        excelData,
        processedData,
        categoriesData,
        googleSheetsId,
        selectedFund,
        updateExcelData,
        updateProcessedData,
        updateCategoriesData,
        updateSelectedFund,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

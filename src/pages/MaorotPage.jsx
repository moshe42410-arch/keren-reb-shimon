import React, { useEffect, useState } from 'react'
import { loadMaorotData, saveMaorotData } from '../services/maorotStorage'
import SupportedDirectoryTab from '../components/maorot/SupportedDirectoryTab'
import SupportsManagementTab from '../components/maorot/SupportsManagementTab'
import SupportsGeneratorTab from '../components/maorot/SupportsGeneratorTab'
import ReturnUploadTab from '../components/maorot/ReturnUploadTab'
import MovementsBoardTab from '../components/maorot/MovementsBoardTab'
import CategoriesManagementTab from '../components/maorot/CategoriesManagementTab'
import MaorotSidebar from '../components/maorot/MaorotSidebar'

const tabs = [
  { id: 'return-upload', label: 'העלאת נתונים' },
  { id: 'movements-board', label: 'לוח תנועות' },
  { id: 'directory', label: 'אלפון נתמכים' },
  { id: 'supports', label: 'ניהול תמיכות' },
  { id: 'categories', label: 'ניהול קטגוריות' },
  { id: 'generator', label: 'מחולל תמיכות' },
]

const MaorotPage = () => {
  const [activeTab, setActiveTab] = useState('directory')
  const [maorotData, setMaorotData] = useState(() => loadMaorotData())

  useEffect(() => {
    saveMaorotData(maorotData)
  }, [maorotData])

  return (
    <div className="flex">
      <MaorotSidebar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">מאורות</h1>
          <p className="text-sm text-gray-500 mb-6">
            ניהול נתוני תמיכות, אלפון נתמכים והפקת קבצים חודשיים.
          </p>

          {activeTab === 'return-upload' && (
            <ReturnUploadTab
              lastGeneratedFileRows={maorotData.lastGeneratedFileRows}
              lastGeneratedMonthKey={maorotData.lastGeneratedMonthKey}
              returnFileRows={maorotData.returnFileRows}
              validationResults={maorotData.validationResults}
              directoryEntries={maorotData.directoryEntries}
              onReturnFileRowsChange={(rows) =>
                setMaorotData((prev) => ({ ...prev, returnFileRows: rows }))
              }
              onValidationResultsChange={(results) =>
                setMaorotData((prev) => ({ ...prev, validationResults: results }))
              }
              onDirectoryChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, directoryEntries: entries }))
              }
            />
          )}

          {activeTab === 'movements-board' && (
            <MovementsBoardTab
              returnFileRows={maorotData.returnFileRows}
              supports={maorotData.supports}
              supportsHeaders={maorotData.supportsHeaders}
              onSupportsChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, supports: entries }))
              }
              onReturnFileRowsChange={(rows) =>
                setMaorotData((prev) => ({ ...prev, returnFileRows: rows }))
              }
            />
          )}

          {activeTab === 'directory' && (
            <SupportedDirectoryTab
              directoryEntries={maorotData.directoryEntries}
              onDirectoryChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, directoryEntries: entries }))
              }
            />
          )}

          {activeTab === 'supports' && (
            <SupportsManagementTab
              supports={maorotData.supports}
              supportsHeaders={maorotData.supportsHeaders}
              supportsColumnMapping={maorotData.supportsColumnMapping}
              directoryEntries={maorotData.directoryEntries}
              categories={maorotData.categories || []}
              onSupportsChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, supports: entries }))
              }
              onSupportsSave={({ entries, headers, columnMapping }) =>
                setMaorotData((prev) => ({
                  ...prev,
                  supports: entries,
                  supportsHeaders: headers,
                  supportsColumnMapping: columnMapping,
                }))
              }
            />
          )}

          {activeTab === 'categories' && <CategoriesManagementTab />}

          {activeTab === 'generator' && (
            <SupportsGeneratorTab
              supports={maorotData.supports}
              supportsHeaders={maorotData.supportsHeaders}
              supportsColumnMapping={maorotData.supportsColumnMapping}
              extraSupports={maorotData.extraSupports}
              exportedExtraSupports={maorotData.exportedExtraSupports}
              exportLog={maorotData.exportLog}
              directoryEntries={maorotData.directoryEntries}
              lastGeneratedMonth={maorotData.lastGeneratedMonth}
              lastGeneratedMonthKey={maorotData.lastGeneratedMonthKey}
              lastGeneratedFileRows={maorotData.lastGeneratedFileRows}
              supportRequestMapping={maorotData.supportRequestMapping}
              autoGenerateSupportRequests={maorotData.autoGenerateSupportRequests}
              onSupportsChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, supports: entries }))
              }
              onExtraSupportsChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, extraSupports: entries }))
              }
              onExportedExtraSupportsChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, exportedExtraSupports: entries }))
              }
              onExportLogChange={(entries) =>
                setMaorotData((prev) => ({ ...prev, exportLog: entries }))
              }
              onLastGeneratedMonthChange={(month) =>
                setMaorotData((prev) => ({ ...prev, lastGeneratedMonth: month }))
              }
              onLastGeneratedValidationChange={({ rows, monthKey }) =>
                setMaorotData((prev) => ({
                  ...prev,
                  lastGeneratedFileRows: rows,
                  lastGeneratedMonthKey: monthKey,
                }))
              }
              onSupportRequestMappingChange={(mapping) =>
                setMaorotData((prev) => ({ ...prev, supportRequestMapping: mapping }))
              }
              onAutoGenerateSupportRequestsChange={(value) =>
                setMaorotData((prev) => ({
                  ...prev,
                  autoGenerateSupportRequests: value,
                }))
              }
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default MaorotPage

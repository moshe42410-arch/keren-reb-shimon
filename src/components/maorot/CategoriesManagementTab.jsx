import React, { useState, useMemo } from 'react'
import { loadMaorotData, saveMaorotData } from '../../services/maorotStorage'
import { normalizeString, readSpreadsheetFile } from '../../utils/maorotUtils'

const CategoriesManagementTab = () => {
  const [categories, setCategories] = useState(() => {
    const maorotData = loadMaorotData()
    return maorotData.categories || []
  })
  const [formFrame, setFormFrame] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleAddCategory = () => {
    if (!formFrame.trim() || !formCategory.trim()) {
      setError('יש למלא מסגרת וקטגוריה')
      return
    }

    const newCategory = {
      id: `${Date.now()}-${Math.random()}`,
      frame: normalizeString(formFrame),
      category: normalizeString(formCategory),
    }

    const updatedCategories = [...categories, newCategory]
    setCategories(updatedCategories)
    
    const maorotData = loadMaorotData()
    saveMaorotData({ ...maorotData, categories: updatedCategories })

    setFormFrame('')
    setFormCategory('')
    setError('')
  }

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const { rawData } = await readSpreadsheetFile(file)
      if (!rawData || rawData.length < 2) {
        setError('הקובץ צריך להכיל לפחות שורת כותרות ושורת נתונים אחת')
        setLoading(false)
        event.target.value = ''
        return
      }

      const headers = rawData[0] || []
      const frameIndex = headers.findIndex((h) => 
        normalizeString(h).includes('מסגרת') || normalizeString(h).includes('frame')
      )
      const categoryIndex = headers.findIndex((h) => 
        normalizeString(h).includes('קטגוריה') || normalizeString(h).includes('category')
      )

      if (frameIndex === -1 || categoryIndex === -1) {
        setError('הקובץ צריך להכיל עמודות "מסגרת" ו"קטגוריה"')
        setLoading(false)
        event.target.value = ''
        return
      }

      const importedCategories = rawData.slice(1)
        .filter((row) => row && row[frameIndex] && row[categoryIndex])
        .map((row) => ({
          id: `${Date.now()}-${Math.random()}-${row[frameIndex]}-${row[categoryIndex]}`,
          frame: normalizeString(row[frameIndex]),
          category: normalizeString(row[categoryIndex]),
        }))

      const updatedCategories = [...categories, ...importedCategories]
      setCategories(updatedCategories)
      
      const maorotData = loadMaorotData()
      saveMaorotData({ ...maorotData, categories: updatedCategories })

      setError('')
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ. ודא שזה Excel תקין.')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleToggleCategory = (id) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(categories.map((c) => c.id)))
    }
  }

  const handleDelete = () => {
    if (selectedCategories.size === 0) {
      setError('יש לבחור לפחות קטגוריה אחת למחיקה')
      return
    }
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    const updatedCategories = categories.filter((c) => !selectedCategories.has(c.id))
    setCategories(updatedCategories)
    
    const maorotData = loadMaorotData()
    saveMaorotData({ ...maorotData, categories: updatedCategories })

    setSelectedCategories(new Set())
    setShowDeleteDialog(false)
  }

  const uniqueFrames = useMemo(() => {
    return [...new Set(categories.map((c) => c.frame).filter(Boolean))].sort()
  }, [categories])

  const uniqueCategories = useMemo(() => {
    return [...new Set(categories.map((c) => c.category).filter(Boolean))].sort()
  }, [categories])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">ניהול קטגוריות</h2>
            <p className="text-sm text-gray-500">
              ניהול מסגרות וקטגוריות לתמיכות. הקטגוריות יסונכרנו עם לשונית ניהול תמיכות.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors text-sm">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImport}
              />
              {loading ? 'טוען...' : 'ייבוא מקובץ'}
            </label>
            {selectedCategories.size > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                מחק ({selectedCategories.size})
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">הוספת קטגוריה ידנית</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">מסגרת</label>
            <input
              type="text"
              value={formFrame}
              onChange={(e) => setFormFrame(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="הזן מסגרת"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">קטגוריה</label>
            <input
              type="text"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="הזן קטגוריה"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAddCategory}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
          >
            הוסף קטגוריה
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">רשימת קטגוריות</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCategories.size === categories.length && categories.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">בחר הכל</span>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            אין קטגוריות. הוסף קטגוריה חדשה או ייבא מקובץ.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right border-b">בחר</th>
                  <th className="px-4 py-2 text-right border-b">מסגרת</th>
                  <th className="px-4 py-2 text-right border-b">קטגוריה</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(cat.id)}
                        onChange={() => handleToggleCategory(cat.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-2">{cat.frame || '-'}</td>
                    <td className="px-4 py-2">{cat.category || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* דיאלוג מחיקה */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">מחיקת קטגוריות</h3>
            <p className="text-gray-700 mb-6">
              האם אתה בטוח שברצונך למחוק {selectedCategories.size} קטגוריות?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoriesManagementTab

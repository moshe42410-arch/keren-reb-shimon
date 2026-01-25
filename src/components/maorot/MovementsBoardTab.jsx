import React, { useMemo } from 'react'
import {
  buildSupportIdentifiers,
  formatDateDisplay,
  normalizeIdentifier,
  normalizeString,
} from '../../utils/maorotUtils'

const MovementsBoardTab = ({ returnFileRows = [], supports = [], supportsHeaders = [] }) => {
  const rows = useMemo(() => {
    if (!returnFileRows.length) return []
    const supportLookup = new Map()
    supports.forEach((support) => {
      const identifiers = buildSupportIdentifiers(support, supportsHeaders)
      identifiers.forEach((id) => {
        if (id) supportLookup.set(id, support)
      })
    })

    return returnFileRows.map((row) => {
      const idCandidates = [
        normalizeIdentifier(row.idNumber),
        normalizeIdentifier(row.generalSupplierNumber),
        normalizeIdentifier(row.maorotSupplierNumber),
      ].filter(Boolean)

      let supportMatch = null
      for (const id of idCandidates) {
        if (supportLookup.has(id)) {
          supportMatch = supportLookup.get(id)
          break
        }
      }

      const rawRow = supportMatch?.rawRow || []
      const categoryIndex = supportsHeaders.findIndex((header) =>
        normalizeString(header).includes('קטגוריה')
      )
      const frameIndex = supportsHeaders.findIndex((header) =>
        normalizeString(header).includes('מסגרת')
      )

      const categoryValue =
        categoryIndex >= 0 && rawRow[categoryIndex]
          ? normalizeString(rawRow[categoryIndex])
          : 'לא סווג'
      const frameValue =
        frameIndex >= 0 && rawRow[frameIndex]
          ? normalizeString(rawRow[frameIndex])
          : 'לא סווג'

      return {
        idNumber: row.idNumber || '',
        generalSupplierNumber: row.generalSupplierNumber || '',
        maorotSupplierNumber: row.maorotSupplierNumber || '',
        name: row.name || '',
        date: formatDateDisplay(row.date),
        amount: row.amount ?? '',
        category: categoryValue,
        frame: frameValue,
      }
    })
  }, [returnFileRows, supports, supportsHeaders])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">לוח תנועות</h2>
          <p className="text-sm text-gray-500">
            מציג את הקובץ החוזר לאחר שמירה, עם סנכרון קטגוריה ומסגרת מניהול תמיכות.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
          אין נתונים להצגה. יש להעלות קובץ חוזר וללחוץ על "שמור נתונים".
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[1200px] text-sm text-right">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 border-b">מ.ז</th>
                  <th className="px-4 py-3 border-b">מס' ספק כולל</th>
                  <th className="px-4 py-3 border-b">מס' ספק מאורות</th>
                  <th className="px-4 py-3 border-b">שם</th>
                  <th className="px-4 py-3 border-b">תאריך</th>
                  <th className="px-4 py-3 border-b">סכום</th>
                  <th className="px-4 py-3 border-b">קטגוריה</th>
                  <th className="px-4 py-3 border-b">מסגרת</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.idNumber}-${index}`} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border-b">{row.idNumber}</td>
                    <td className="px-4 py-2 border-b">{row.generalSupplierNumber}</td>
                    <td className="px-4 py-2 border-b">{row.maorotSupplierNumber}</td>
                    <td className="px-4 py-2 border-b">{row.name}</td>
                    <td className="px-4 py-2 border-b">{row.date}</td>
                    <td className="px-4 py-2 border-b">{row.amount}</td>
                    <td className="px-4 py-2 border-b">{row.category}</td>
                    <td className="px-4 py-2 border-b">{row.frame}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default MovementsBoardTab

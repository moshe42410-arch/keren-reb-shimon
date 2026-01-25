import React, { useMemo, useState } from 'react'
import {
  normalizeString,
  parseDirectoryRows,
  readSpreadsheetFile,
} from '../../utils/maorotUtils'

const emptyForm = {
  idNumber: '',
  maorotSupplierNumber: '',
  generalSupplierNumber: '',
  name: '',
  bankNumber: '',
  branchNumber: '',
  accountNumber: '',
}

const SupportedDirectoryTab = ({ directoryEntries, onDirectoryChange }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [formValues, setFormValues] = useState(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return directoryEntries
    const query = normalizeString(searchTerm).toLowerCase()
    return directoryEntries.filter((entry) => {
      return [
        entry.idNumber,
        entry.maorotSupplierNumber,
        entry.generalSupplierNumber,
        entry.name,
        entry.bankNumber,
        entry.branchNumber,
        entry.accountNumber,
      ]
        .map((value) => normalizeString(value).toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [directoryEntries, searchTerm])

  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const { rawData } = await readSpreadsheetFile(file)
      const { entries } = parseDirectoryRows(rawData)
      onDirectoryChange(entries)
    } catch (err) {
      console.error(err)
      setError('לא ניתן לקרוא את הקובץ. ודא שזה Excel או CSV תקין.')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleAddEntry = () => {
    setError('')
    if (!normalizeString(formValues.idNumber) || !normalizeString(formValues.name)) {
      setError('אנא מלא מ.ז ושם נתמך.')
      return
    }
    const newEntry = {
      id: `${Date.now()}`,
      ...formValues,
    }
    onDirectoryChange([newEntry, ...directoryEntries])
    setFormValues(emptyForm)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">אלפון נתמכים</h2>
            <p className="text-sm text-gray-500">
              ניהול מקבלי תמיכה, חיפוש מהיר ועדכון מרוכז.
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
            <button
              type="button"
              onClick={() => setFormValues(emptyForm)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              איפוס טופס
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">הוספת פריט בודד</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="מ.ז"
            value={formValues.idNumber}
            onChange={(event) => setFormValues({ ...formValues, idNumber: event.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="שם"
            value={formValues.name}
            onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="מס' ספק מאורות"
            value={formValues.maorotSupplierNumber}
            onChange={(event) =>
              setFormValues({ ...formValues, maorotSupplierNumber: event.target.value })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="מס' ספק כולל"
            value={formValues.generalSupplierNumber}
            onChange={(event) =>
              setFormValues({ ...formValues, generalSupplierNumber: event.target.value })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="מס' בנק"
            value={formValues.bankNumber}
            onChange={(event) => setFormValues({ ...formValues, bankNumber: event.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="מס' סניף"
            value={formValues.branchNumber}
            onChange={(event) => setFormValues({ ...formValues, branchNumber: event.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="מס' חשבון"
            value={formValues.accountNumber}
            onChange={(event) => setFormValues({ ...formValues, accountNumber: event.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAddEntry}
            className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            הוסף פריט
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">טבלת נתמכים</h3>
          <input
            type="text"
            placeholder="חיפוש לפי מ.ז, שם, בנק וכו'"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 w-full md:w-72"
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-right">מ.ז</th>
                <th className="px-3 py-2 text-right">מס' ספק כולל</th>
                <th className="px-3 py-2 text-right">מס' ספק מאורות</th>
                <th className="px-3 py-2 text-right">שם</th>
                <th className="px-3 py-2 text-right">מס' בנק</th>
                <th className="px-3 py-2 text-right">מס' סניף</th>
                <th className="px-3 py-2 text-right">מס' חשבון</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    אין נתונים להצגה.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{entry.idNumber || '-'}</td>
                    <td className="px-3 py-2">{entry.generalSupplierNumber || '-'}</td>
                    <td className="px-3 py-2">{entry.maorotSupplierNumber || '-'}</td>
                    <td className="px-3 py-2">{entry.name || '-'}</td>
                    <td className="px-3 py-2">{entry.bankNumber || '-'}</td>
                    <td className="px-3 py-2">{entry.branchNumber || '-'}</td>
                    <td className="px-3 py-2">{entry.accountNumber || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SupportedDirectoryTab

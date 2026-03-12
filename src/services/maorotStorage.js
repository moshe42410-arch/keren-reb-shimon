const STORAGE_KEY = 'maorot_data_v1'

const defaultData = {
  directoryEntries: [],
  supports: [],
  supportsHeaders: [],
  supportsColumnMapping: {},
  extraSupports: [],
  exportedExtraSupports: [],
  exportLog: [],
  lastGeneratedMonth: null,
  lastGeneratedMonthKey: null,
  lastGeneratedFileRows: [],
  returnFileRows: [],
  validationResults: {
    missingInGenerated: [],
    missingInReturn: [],
  },
  supportRequestMapping: {
    idNumber: 'מ.ז',
    name: 'שם',
    amount: 'סכום',
    bankNumber: "מס' בנק",
    branchNumber: "מס' סניף",
    accountNumber: "מס' חשבון",
    maorotSupplierNumber: "מס' ספק מאורות",
    generalSupplierNumber: "מס' ספק כולל",
    supportType: 'סוג תמיכה',
    month: 'חודש',
  },
  autoGenerateSupportRequests: true,
  categories: [], // [{ id, frame, category }]
}

export const loadMaorotData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultData }
    const parsed = JSON.parse(raw)
    return { ...defaultData, ...parsed }
  } catch (error) {
    console.error('שגיאה בקריאת נתוני מאורות:', error)
    return { ...defaultData }
  }
}

export const saveMaorotData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('maorotDataUpdated'))
    }
  } catch (error) {
    console.error('שגיאה בשמירת נתוני מאורות:', error)
  }
}

import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import JSZip from 'jszip'

const sanitizeFileName = (value) => {
  if (!value) return 'support-request'
  return String(value)
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

export const buildSupportRequestData = ({ support, directoryEntry, mapping, monthKey }) => {
  const values = {
    idNumber: support.idNumber || '',
    name: support.name || directoryEntry?.name || '',
    amount: support.amount || '',
    supportType: support.supportType || '',
    month: monthKey || '',
    bankNumber: directoryEntry?.bankNumber || '',
    branchNumber: directoryEntry?.branchNumber || '',
    accountNumber: directoryEntry?.accountNumber || '',
    maorotSupplierNumber: directoryEntry?.maorotSupplierNumber || '',
    generalSupplierNumber: directoryEntry?.generalSupplierNumber || '',
  }

  const templateData = {}
  Object.entries(mapping || {}).forEach(([field, placeholder]) => {
    if (!placeholder) return
    templateData[placeholder] = values[field] ?? ''
  })

  return templateData
}

export const generateSupportRequestZip = async ({
  templateArrayBuffer,
  supports,
  directoryLookup,
  mapping,
  monthKey,
}) => {
  const zip = new JSZip()
  const missingDirectoryIds = []
  const failedSupports = []

  supports.forEach((support, index) => {
    try {
      const directoryEntry = directoryLookup?.[support.idNumber] || null
      if (!directoryEntry && support.idNumber) {
        missingDirectoryIds.push(support.idNumber)
      }

      const data = buildSupportRequestData({
        support,
        directoryEntry,
        mapping,
        monthKey,
      })

      const templateZip = new PizZip(templateArrayBuffer)
      const doc = new Docxtemplater(templateZip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      })
      doc.setData(data)
      doc.render()
      const docBuffer = doc.getZip().generate({
        type: 'arraybuffer',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const fileLabel = support.idNumber || support.name || `support_${index + 1}`
      const fileName = `בקשת_תמיכה_${sanitizeFileName(fileLabel)}.docx`
      zip.file(fileName, docBuffer)
    } catch (error) {
      failedSupports.push({
        idNumber: support.idNumber,
        name: support.name,
        error: error.message,
      })
    }
  })

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return {
    zipBlob,
    missingDirectoryIds: [...new Set(missingDirectoryIds)],
    failedSupports,
  }
}

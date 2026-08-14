import { useEffect, useState } from 'react'
import { subscribeClientDocuments, addDocumentMeta } from '../../../lib/firestore'
import { UploadIcon, FileIcon, DownloadIcon } from '../../icons'

const ACCEPTED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentosTab({ client, actorName }) {
  const [documents, setDocuments] = useState([])
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => subscribeClientDocuments(client.id, setDocuments), [client.id])

  const handleFiles = (files) => {
    Array.from(files).forEach((file) => {
      addDocumentMeta(client.id, { name: file.name, type: file.type || 'archivo', size: file.size }, actorName)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition-colors duration-150"
        style={{ borderColor: dragOver ? 'rgba(30,95,173,0.5)' : 'rgba(255,255,255,0.12)' }}
      >
        <UploadIcon size={20} style={{ color: '#888888' }} />
        <p className="text-[13px] text-[#888888]">Arrastra un archivo aquí o</p>
        <label className="cursor-pointer text-[13px] font-medium text-[#1E5FAD] hover:underline">
          selecciona uno
          <input
            type="file"
            multiple
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
        <p className="mt-1 text-[11px] text-[#444444]">PDF, Word, Excel</p>
      </div>

      {documents.length === 0 ? (
        <p className="text-center text-[13px] font-light text-[#444444]">Sin documentos adjuntos</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {documents.map((docItem) => (
            <div key={docItem.id} className="flex items-center gap-3 py-3">
              <FileIcon size={18} style={{ color: '#888888' }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-[#F5F5F5]">{docItem.name}</div>
                <div className="text-[11px] text-[#444444]">{formatDate(docItem.uploadedAt)}</div>
              </div>
              <button
                type="button"
                disabled
                title="Almacenamiento de archivos no habilitado aún"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#444444]"
              >
                <DownloadIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

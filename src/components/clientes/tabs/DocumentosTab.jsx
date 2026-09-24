import { useEffect, useState } from 'react'
import { subscribeClientDocuments, addDocumentMeta } from '../../../lib/firestore'
import { driveFileKind } from '../../../lib/googleDrive'
import { useDrivePicker } from '../../../hooks/useDrivePicker'
import { UploadIcon, FileIcon, ArrowRightIcon } from '../../icons'
import { useToast } from '../../../hooks/useToast'

function formatDate(value) {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Documents live in the company's Google Drive; this tab keeps each one's
// link and name on clients/{id}/documents. Google's picker also has a
// "Subir" tab, so a PDF on your computer goes straight into Drive from
// here. Records from before Drive (name/size only, no file) still list,
// marked as such.
export default function DocumentosTab({ client, actorName }) {
  const [documents, setDocuments] = useState([])
  const drive = useDrivePicker('clientes')
  const showToast = useToast()

  useEffect(() => subscribeClientDocuments(client.id, setDocuments), [client.id])

  const attach = async () => {
    const files = await drive.pick({ multiple: true, title: `Documentos de ${client.name}` })
    if (!files.length) return
    try {
      await Promise.all(files.map((f) => addDocumentMeta(client.id, { ...f, type: driveFileKind(f.mimeType), source: 'drive' }, actorName)))
      showToast(files.length > 1 ? `${files.length} documentos adjuntados.` : 'Documento adjuntado.')
    } catch (error) {
      showToast(`No se pudo adjuntar: ${error.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={attach}
        disabled={drive.busy}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] px-6 py-8 text-center transition-colors duration-150 hover:border-[#1E5FAD]/50 disabled:opacity-60"
      >
        <UploadIcon size={20} style={{ color: '#888888' }} />
        <p className="text-[13px] font-medium text-[#6FA3E0]">{drive.busy ? 'Abriendo Google Drive…' : 'Adjuntar desde Google Drive'}</p>
        <p className="text-[11px] text-[#666666]">Elige un archivo de Drive o súbelo desde tu computadora (PDF, Word, Excel…)</p>
      </button>

      {documents.length === 0 ? (
        <p className="text-center text-[13px] font-light text-[#555555]">Sin documentos adjuntos</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {documents.map((docItem) => {
            const open = docItem.url
            const Row = open ? 'a' : 'div'
            return (
              <Row
                key={docItem.id}
                {...(open ? { href: docItem.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`group flex items-center gap-3 py-3 ${open ? 'rounded-lg px-1 hover:bg-white/[0.03]' : ''}`}
              >
                {docItem.iconUrl ? <img src={docItem.iconUrl} alt="" className="h-4 w-4" /> : <FileIcon size={18} style={{ color: '#888888' }} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-[#F5F5F5]">{docItem.name}</div>
                  <div className="text-[11px] text-[#666666]">
                    {open ? `${docItem.type || 'Archivo'} en Google Drive` : 'Registro antiguo — sin archivo guardado'} · {formatDate(docItem.uploadedAt)}
                  </div>
                </div>
                {open && (
                  <span className="flex items-center gap-1 text-[11px] text-[#6FA3E0] opacity-0 transition-opacity group-hover:opacity-100">
                    Abrir <ArrowRightIcon size={11} />
                  </span>
                )}
              </Row>
            )
          })}
        </div>
      )}
      {drive.prompt}
    </div>
  )
}

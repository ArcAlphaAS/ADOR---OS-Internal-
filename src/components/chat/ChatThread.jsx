import { useEffect, useRef, useState } from 'react'
import { findDriveLink, driveDocType, splitLinks } from '../../lib/chat'
import { resizeImageToDataUrl } from '../../lib/image'
import { MessageIcon, ArrowRightIcon, EditIcon, CloseIcon, PaperclipIcon, ImageIcon, FileIcon, FolderIcon, PhoneIcon, VideoIcon } from '../icons'

function formatTime(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toDateString()
}

function dayLabel(ts) {
  const date = ts.toDate()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

function LinkedText({ text }) {
  return splitLinks(text).map((part, i) =>
    part.type === 'link' ? (
      <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-white/30 underline-offset-2 hover:decoration-white/70">
        {part.value}
      </a>
    ) : (
      <span key={i}>{part.value}</span>
    )
  )
}

// The official version of a document lives in Google Drive — this card is
// how that distinction shows up in the thread: a Drive link reads as "the
// record," a pasted image reads as "part of the conversation."
function DriveCard({ url }) {
  const type = driveDocType(url)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-[280px] items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-3 transition-colors duration-150 hover:border-white/[0.2]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(30,95,173,0.16)', color: '#5B9BD9' }}>
        {type === 'Carpeta' ? <FolderIcon size={16} /> : <FileIcon size={16} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-[#F5F5F5]">{type} en Google Drive</span>
        <span className="block text-[11px] text-[#B8860B]">Documento oficial · abrir en Drive</span>
      </span>
    </a>
  )
}

function ImageAttachment({ attachment }) {
  return (
    <a href={attachment.dataUrl} target="_blank" rel="noopener noreferrer" className="block">
      <img src={attachment.dataUrl} alt={attachment.name || 'Imagen'} className="max-h-[260px] max-w-[320px] rounded-xl border border-white/[0.08] object-cover" />
      <span className="mt-1 block px-1 text-[10.5px] text-[#555555]">Archivo de conversación · {attachment.name}</span>
    </a>
  )
}

function CallCard({ call, authorName, mine }) {
  const video = call.type === 'video'
  return (
    <div className="flex w-[280px] items-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(76,175,80,0.14)', color: '#4CAF50' }}>
        {video ? <VideoIcon size={16} /> : <PhoneIcon size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium text-[#F5F5F5]">{video ? 'Videollamada' : 'Llamada'}</span>
        <span className="block truncate text-[11px] text-[#666666]">{mine ? 'Iniciaste' : `${authorName} inició`} una reunión en Google Meet</span>
      </span>
      <a
        href={call.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-white"
        style={{ background: '#1E5FAD' }}
      >
        Unirse
      </a>
    </div>
  )
}

// Hover reveals small edit/delete actions on your own messages. Call
// cards and image-only messages can be deleted but not edited — there's
// no text to fix.
function MessageBubble({ message, mine, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const driveUrl = findDriveLink(message.text)
  const hasText = Boolean(message.text)
  // A message that's nothing but a Drive link shows just the card — the
  // raw URL in a bubble above it would say the same thing twice.
  const showBubble = hasText && message.text.trim() !== driveUrl

  if (editing) {
    return (
      <div className="flex max-w-[70%] flex-col items-end gap-1">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onEdit(draft.trim())
              setEditing(false)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full rounded-2xl border border-white/[0.2] bg-[#141414] px-3.5 py-2 text-[13.5px] text-[#F5F5F5] outline-none"
        />
        <p className="px-1 text-[10.5px] text-[#666666]">Enter para guardar · Esc para cancelar</p>
      </div>
    )
  }

  return (
    <div className={`group flex max-w-[70%] flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      {!mine && <p className="px-1 text-[11px] font-medium text-[#666666]">{message.authorName}</p>}
      <div className="flex items-center gap-1.5">
        {mine && (
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {hasText && !message.call && (
              <button type="button" onClick={() => setEditing(true)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#666666] hover:bg-white/[0.06] hover:text-[#F5F5F5]">
                <EditIcon size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              title={confirmDelete ? 'Clic otra vez para eliminar' : 'Eliminar'}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#EF5350]/10"
              style={{ color: confirmDelete ? '#EF5350' : '#666666' }}
            >
              <CloseIcon size={11} />
            </button>
          </span>
        )}
        <div className={`flex flex-col gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
          {message.call && <CallCard call={message.call} authorName={message.authorName} mine={mine} />}
          {message.attachment?.kind === 'image' && <ImageAttachment attachment={message.attachment} />}
          {showBubble && (
            <div
              className="rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed"
              style={{
                background: mine ? '#1E5FAD' : 'rgba(255,255,255,0.06)',
                color: mine ? '#F5F5F5' : '#DDDDDD',
                borderBottomRightRadius: mine ? 4 : undefined,
                borderBottomLeftRadius: mine ? undefined : 4,
              }}
            >
              <LinkedText text={message.text} />
            </div>
          )}
          {driveUrl && <DriveCard url={driveUrl} />}
        </div>
      </div>
      <p className="px-1 text-[10.5px] text-[#444444]">
        {formatTime(message.createdAt)}
        {message.editedAt ? ' (editado)' : ''}
      </p>
    </div>
  )
}

function DateDivider({ ts }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[11px] font-medium text-[#555555]">{dayLabel(ts)}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

export function MessageThread({ messages, currentUid, onEdit, onDelete }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  let lastDay = null

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MessageIcon size={20} className="text-[#333333]" />
          <p className="text-[13px] text-[#444444]">Sin mensajes todavía — escribe el primero.</p>
        </div>
      ) : (
        messages.map((m) => {
          const mine = m.authorUid === currentUid
          const key = dayKey(m.createdAt)
          const showDivider = key && key !== lastDay
          lastDay = key
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {showDivider && <DateDivider ts={m.createdAt} />}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble message={m} mine={mine} onEdit={(text) => onEdit(m.id, text)} onDelete={() => onDelete(m.id)} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// Firestore caps a document at 1MB and the image lives inside the message
// doc itself (Storage isn't enabled) — leave headroom for the other fields.
const MAX_IMAGE_CHARS = 900_000

function AttachOption({ icon, label, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className="flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#CCCCCC] transition-colors duration-150 hover:border-white/[0.2] hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  )
}

// The attach tray sits in normal flow directly above the input (not a
// floating popover), so there's no portal/positioning to get wrong.
// Three deliberately different options, one per kind of "file":
//   Imagen — a conversation file, compressed into the message.
//   Documento de Drive — the official document, shared as a link.
//   Otro archivo — disabled until Firebase Storage is enabled.
export function Composer({ onSend, onError }) {
  const [text, setText] = useState('')
  const [tray, setTray] = useState(false)
  const [driveMode, setDriveMode] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef(null)
  const inputRef = useRef(null)

  const reset = () => {
    setText('')
    setPendingImage(null)
    setDriveMode(false)
    setTray(false)
  }

  const submit = () => {
    if (driveMode) {
      if (!findDriveLink(text)) return onError('Pega un enlace de Google Drive, Docs, Sheets o Slides.')
    }
    if (!text.trim() && !pendingImage) return
    onSend({ text: text.trim(), attachment: pendingImage || undefined })
    reset()
  }

  const pickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return onError('Solo imágenes por ahora — los documentos oficiales se comparten desde Google Drive.')
    setProcessing(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1400, 0.8)
      if (dataUrl.length > MAX_IMAGE_CHARS) return onError('La imagen es demasiado pesada incluso comprimida. Prueba con una más pequeña.')
      setPendingImage({ kind: 'image', dataUrl, name: file.name })
      setTray(false)
      inputRef.current?.focus()
    } catch (err) {
      onError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
      {tray && (
        <div className="flex flex-wrap items-center gap-2">
          <AttachOption icon={<ImageIcon size={13} />} label={processing ? 'Procesando...' : 'Imagen'} hint="Archivo de conversación" onClick={() => fileRef.current?.click()} disabled={processing} />
          <AttachOption
            icon={<FileIcon size={13} />}
            label="Documento de Drive"
            hint="El documento oficial vive en Google Drive — compártelo como enlace"
            onClick={() => {
              setDriveMode(true)
              setTray(false)
              inputRef.current?.focus()
            }}
          />
          <AttachOption icon={<PaperclipIcon size={13} />} label="Otro archivo" hint="Requiere activar Firebase Storage — todavía no está habilitado" disabled />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
        </div>
      )}

      {pendingImage && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 pr-3">
          <img src={pendingImage.dataUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-[#DDDDDD]">{pendingImage.name}</p>
            <p className="text-[11px] text-[#555555]">Archivo de conversación — añade un mensaje o envíalo solo</p>
          </div>
          <button type="button" onClick={() => setPendingImage(null)} className="text-[#666666] hover:text-[#F5F5F5]">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {driveMode && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11.5px] text-[#888888]">
            Pega el enlace del documento en Drive — el oficial se queda allá, aquí solo compartes el acceso.
          </p>
          <button type="button" onClick={() => setDriveMode(false)} className="flex-shrink-0 text-[11.5px] text-[#666666] hover:text-[#F5F5F5]">
            Cancelar
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTray((v) => !v)}
          title="Adjuntar"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-[#888888] transition-colors duration-150 hover:text-[#F5F5F5]"
          style={tray ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
        >
          <PaperclipIcon size={15} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') reset()
          }}
          placeholder={driveMode ? 'https://docs.google.com/...' : 'Escribe un mensaje...'}
          className="min-w-0 flex-1 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() && !pendingImage}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#F5F5F5] transition-opacity duration-150 disabled:opacity-40"
          style={{ background: '#1E5FAD' }}
        >
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  )
}

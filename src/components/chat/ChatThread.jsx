import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageIcon } from '../icons'
import { MessageBubble, loadBlob } from './MessageBubble'

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


function DateDivider({ ts }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[11px] font-medium text-[#8A8A8A]">{dayLabel(ts)}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

// Slack's red "new" line, in ADOR gold: where the messages you hadn't read
// start. The conversation opens scrolled to it instead of to the bottom.
function NewDivider() {
  return (
    <div id="chat-new-divider" className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-[#B8860B]/50" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#E8C15A]">Nuevos mensajes</span>
      <div className="h-px flex-1 bg-[#B8860B]/50" />
    </div>
  )
}

const GROUP_GAP_MS = 5 * 60 * 1000
const ms = (ts) => ts?.toMillis?.() || 0

// Consecutive messages from the same person, same day, a few minutes apart,
// read as one block (iMessage/Slack): name and avatar once at the top, time
// and receipts once at the bottom, tighter spacing in between. Calls,
// images and voice notes still group — only who/when decides.
function groupFlags(list) {
  return list.map((m, i) => {
    const prev = list[i - 1]
    const next = list[i + 1]
    const joinsPrev = prev && prev.authorUid === m.authorUid && dayKey(prev.createdAt) === dayKey(m.createdAt) && ms(m.createdAt) - ms(prev.createdAt) < GROUP_GAP_MS
    const joinsNext = next && next.authorUid === m.authorUid && dayKey(next.createdAt) === dayKey(m.createdAt) && ms(next.createdAt) - ms(m.createdAt) < GROUP_GAP_MS
    return { start: !joinsPrev, end: !joinsNext }
  })
}

export function MessageThread({ conversationKey, isDm, newSince, messages, currentUid, query, hasMore, onLoadMore, savedIds, userName, userPhoto, receiptFor, onEdit, onDelete, onOpenProfile, onReact, onToggleSave, onOpenImage, onOpenThread, pinnedIds, onTogglePin, onRemind, onCreateTask, onOpenTask }) {
  const scrollRef = useRef(null)
  const loadingOlderRef = useRef(null)
  const positionedRef = useRef(null) // conversationKey already positioned on open
  const seenRef = useRef({ key: null, ids: new Set() })
  const q = query?.trim().toLowerCase()
  const shown = q ? messages.filter((m) => (m.text || '').toLowerCase().includes(q) || (m.attachment?.name || '').toLowerCase().includes(q)) : messages
  const lastId = messages[messages.length - 1]?.id
  const flags = groupFlags(shown)

  // First unread message from someone else, if the conversation had any.
  const firstNewIndex = !q && newSince ? shown.findIndex((m) => m.authorUid !== currentUid && ms(m.createdAt) > newSince) : -1

  // Messages present when the conversation opened just appear; only the
  // ones that arrive afterwards get the entrance animation.
  if (seenRef.current.key !== conversationKey) seenRef.current = { key: conversationKey, ids: new Set(messages.map((m) => m.id)), ready: messages.length > 0 }
  if (!seenRef.current.ready && messages.length) {
    // The first batch after opening is the history, not "just arrived".
    messages.forEach((m) => seenRef.current.ids.add(m.id))
    seenRef.current.ready = true
  }
  const isNew = (id) => !seenRef.current.ids.has(id)
  useEffect(() => {
    messages.forEach((m) => seenRef.current.ids.add(m.id))
  })

  // On open: land on "Nuevos mensajes" if there is one, else the bottom.
  // After that: stick to the bottom when a new message arrives or search
  // changes — but when older messages were loaded above, keep the
  // reader's place instead of jumping them back down.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (loadingOlderRef.current !== null) {
      el.scrollTop = el.scrollHeight - loadingOlderRef.current
      loadingOlderRef.current = null
      return
    }
    if (messages.length && positionedRef.current !== conversationKey) {
      positionedRef.current = conversationKey
      const divider = document.getElementById('chat-new-divider')
      if (divider) {
        divider.scrollIntoView({ block: 'center' })
        return
      }
    }
    el.scrollTop = el.scrollHeight
  }, [lastId, messages.length, q, conversationKey])

  const loadOlder = () => {
    loadingOlderRef.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop
    onLoadMore()
  }

  let lastDay = null

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-1 py-4">
      {hasMore && !q && (
        <button type="button" onClick={loadOlder} className="mx-auto mb-3 rounded-full border border-white/[0.1] px-3 py-1 text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
          Cargar mensajes anteriores
        </button>
      )}
      {q && (
        <p className="mb-3 px-1 text-[12.5px] text-[#8A8A8A]">
          {shown.length ? `${shown.length} ${shown.length === 1 ? 'mensaje coincide' : 'mensajes coinciden'} con “${query.trim()}”` : `Nada coincide con “${query.trim()}” en los mensajes cargados.`}
        </p>
      )}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MessageIcon size={20} className="text-[#5A5A5A]" />
          <p className="text-[13.5px] text-[#7A7A7A]">Sin mensajes todavía — escribe el primero.</p>
        </div>
      ) : (
        shown.map((m, i) => {
          const mine = m.authorUid === currentUid
          const key = dayKey(m.createdAt)
          const showDivider = key && key !== lastDay
          lastDay = key
          const { start, end } = flags[i]
          const gap = i === 0 ? 0 : start || showDivider ? 14 : 3
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`flex flex-col ${isNew(m.id) ? 'ador-msg-in' : ''}`} style={{ marginTop: gap }}>
              {showDivider && <DateDivider ts={m.createdAt} />}
              {i === firstNewIndex && <NewDivider />}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble
                  message={m}
                  mine={mine}
                  groupStart={start || showDivider || i === firstNewIndex}
                  groupEnd={end}
                  showAvatar={!isDm}
                  currentUid={currentUid}
                  saved={savedIds.has(m.id)}
                  userName={userName}
                  userPhoto={userPhoto}
                  receipt={mine && end && receiptFor ? receiptFor(m) : null}
                  onOpenThread={onOpenThread ? () => onOpenThread(m) : null}
                  pinned={pinnedIds?.has(m.id)}
                  onTogglePin={onTogglePin ? () => onTogglePin(m) : null}
                  onRemind={onRemind ? (at) => onRemind(m, at) : null}
                  onCreateTask={onCreateTask ? () => onCreateTask(m) : null}
                  onOpenTask={onOpenTask}
                  onEdit={(text) => onEdit(m.id, text)}
                  onDelete={() => onDelete(m.id)}
                  onOpenProfile={onOpenProfile}
                  onReact={(emoji, has) => onReact(m.id, emoji, has)}
                  onToggleSave={() => onToggleSave(m)}
                  onOpenImage={onOpenImage}
                />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// The clipboard only accepts PNG images, so the JPEG is redrawn as PNG
// before copying. Lets Ctrl+V drop it into any other app or chat.
async function copyImageToClipboard(src) {
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d').drawImage(img, 0, 0)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

// Full-size image viewer. Chrome refuses to open a data: URL in a new tab,
// so images open here instead of via target="_blank".
export function ImageLightbox({ attachment, onClose }) {
  const [src, setSrc] = useState(attachment.dataUrl || null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (attachment.dataUrl || !attachment.blobId) return
    let alive = true
    loadBlob(attachment.blobId).then((url) => alive && setSrc(url || attachment.thumbUrl))
    return () => {
      alive = false
    }
  }, [attachment])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/85 p-10" onClick={onClose}>
      {src ? (
        <img src={src} alt={attachment.name} className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      ) : (
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      )}
      <p className="text-[12.5px] text-[#AAAAAA]">
        {attachment.name} · Archivo de conversación
        {src && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                copyImageToClipboard(src)
                  .then(() => setCopied('Copiada — pégala con Ctrl+V'))
                  .catch(() => setCopied('Tu navegador no permitió copiarla'))
              }}
              className="ml-3 text-[#E8C15A] hover:underline"
            >
              {copied || 'Copiar imagen'}
            </button>
            <a href={src} download={attachment.name} onClick={(e) => e.stopPropagation()} className="ml-3 text-[#E8C15A] hover:underline">
              Descargar
            </a>
          </>
        )}
      </p>
    </div>,
    document.body
  )
}


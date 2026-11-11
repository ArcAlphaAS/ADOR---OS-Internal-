import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageIcon } from '../icons'
import { MessageBubble, HighlightContext, loadBlob } from './MessageBubble'

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
    <>
      <div className="flex items-center gap-3 py-2 max-md:hidden">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-[11px] font-medium text-[#8A8A8A]">{dayLabel(ts)}</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>
      <div className="flex justify-center py-3 md:hidden">
        <span className="rounded-full bg-[#1C1C1E] px-3 py-1 text-[12px] font-medium text-[#B5B5BA]">{dayLabel(ts)}</span>
      </div>
    </>
  )
}

// Slack's red "new" line, in ADOR gold: where the messages you hadn't read
// start. The conversation opens scrolled to it instead of to the bottom.
function NewDivider() {
  return (
    <div id="chat-new-divider" className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-[#F4EEE2]/50" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#F4EEE2]">Nuevos mensajes</span>
      <div className="h-px flex-1 bg-[#F4EEE2]/50" />
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

export function MessageThread({ conversationKey, isDm, newSince, messages, currentUid, query, hasMore, onLoadMore, savedIds, userName, userPhoto, receiptFor, onEdit, onDelete, onOpenProfile, onReact, onToggleSave, onOpenImage, onOpenThread, pinnedIds, onTogglePin, onRemind, onCreateTask, onOpenTask, onOpenEntity, onReply, onForward, onJump, onVote, onClosePoll, onAck, audienceUids }) {
  const scrollRef = useRef(null)
  const loadingOlderRef = useRef(null)
  const positionedRef = useRef(null) // conversationKey already positioned on open
  const seenRef = useRef({ key: null, ids: new Set() })
  const q = query?.trim().toLowerCase()
  // Como WhatsApp/iMessage: la conversación se queda completa (con su contexto),
  // las coincidencias se marcan y ↑ ↓ saltan entre ellas.
  const shown = messages
  const matchIds = q ? messages.filter((m) => (m.text || '').toLowerCase().includes(q) || (m.attachment?.name || '').toLowerCase().includes(q)).map((m) => m.id) : []
  const [matchIdx, setMatchIdx] = useState(0)
  useEffect(() => setMatchIdx(Math.max(0, matchIds.length - 1)), [q]) // eslint-disable-line react-hooks/exhaustive-deps
  const matchKey = matchIds[Math.min(matchIdx, matchIds.length - 1)]
  useEffect(() => {
    if (!q || !matchKey) return
    const el = document.getElementById(`msg-${matchKey}`)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.animate([{ background: 'rgba(244,238,226,0.14)' }, { background: 'transparent' }], { duration: 1400, easing: 'ease-out' })
  }, [q, matchKey])
  const lastId = messages[messages.length - 1]?.id
  const flags = groupFlags(shown)
  // Whether the reader is at (or near) the bottom. While they're reading
  // further up, a new message from someone else doesn't yank them down —
  // a "↓ N mensajes nuevos" button appears instead (Slack/WhatsApp).
  const atBottomRef = useRef(true)
  const [atBottom, setAtBottom] = useState(true)
  const [anchorId, setAnchorId] = useState(null) // last message seen at the bottom
  const prevQRef = useRef(q)

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
    const opening = messages.length && positionedRef.current !== conversationKey
    if (opening) {
      positionedRef.current = conversationKey
      setAnchorId(lastId)
      const divider = document.getElementById('chat-new-divider')
      if (divider) {
        divider.scrollIntoView({ block: 'center' })
        return
      }
    }
    const searchChanged = prevQRef.current !== q
    prevQRef.current = q
    const last = messages[messages.length - 1]
    if (opening || searchChanged || atBottomRef.current || last?.authorUid === currentUid) {
      el.scrollTop = el.scrollHeight
      setAnchorId(lastId)
    }
  }, [lastId, messages.length, q, conversationKey])

  const [floatDay, setFloatDay] = useState(null)
  const floatTimer = useRef(null)
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    atBottomRef.current = bottom
    setAtBottom(bottom)
    if (bottom && anchorId !== lastId) setAnchorId(lastId)
    // Teléfono: mientras desplazas, una píldora arriba dice de qué día son los mensajes que ves.
    if (window.innerWidth < 768) {
      const top = el.getBoundingClientRect().top + 24
      const first = [...el.querySelectorAll('[data-day]')].find((n) => n.getBoundingClientRect().bottom > top)
      if (first) setFloatDay(first.dataset.day)
      clearTimeout(floatTimer.current)
      floatTimer.current = setTimeout(() => setFloatDay(null), 1100)
    }
  }

  const anchorIndex = anchorId ? messages.findIndex((m) => m.id === anchorId) : -1
  const unseen = anchorIndex >= 0 ? messages.slice(anchorIndex + 1).filter((m) => m.authorUid !== currentUid).length : 0

  const scrollToBottom = () => {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setAnchorId(lastId)
  }

  const loadOlder = () => {
    loadingOlderRef.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop
    onLoadMore()
  }

  // Photos sent one after another by the same person (same block) are shown
  // as one grid, anchored on the last of them (it carries time, ticks, actions).
  const isImageOnly = (m) => m.attachment?.kind === 'image' && !m.attachment.expired && !m.text && !m.replyTo && !m.poll && !m.call && !m.forwarded && !m.important
  const albumAt = new Map()
  const skipIdx = new Set()
  for (let i = 0; i < shown.length; i++) {
    if (skipIdx.has(i) || !isImageOnly(shown[i])) continue
    let j = i
    while (j + 1 < shown.length && isImageOnly(shown[j + 1]) && shown[j + 1].authorUid === shown[i].authorUid && !flags[j].end) j++
    if (j > i) {
      albumAt.set(i, { to: j, msgs: shown.slice(i, j + 1) })
      for (let k = i + 1; k <= j; k++) skipIdx.add(k)
    }
  }

  // "Lo que te perdiste": con varios mensajes nuevos de otras personas, un resumen
  // de lo que pasó (quién escribió, si te mencionaron, archivos y encuestas), por
  // reglas simples, sin inteligencia externa.
  const missed = firstNewIndex >= 0 ? shown.slice(firstNewIndex).filter((m) => m.authorUid !== currentUid) : []
  const [catchHidden, setCatchHidden] = useState(false)
  let catchUp = null
  if (missed.length >= 6 && !catchHidden && !q) {
    const by = new Map()
    for (const m of missed) by.set(m.authorName || 'Alguien', (by.get(m.authorName || 'Alguien') || 0) + 1)
    const who = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n.split(' ')[0]} (${c})`).join(', ')
    const mentions = missed.filter((m) => (m.mentionUids || []).includes(currentUid)).length
    const files = missed.filter((m) => m.attachment).length
    const polls = missed.filter((m) => m.poll).length
    const important = missed.filter((m) => m.important).length
    const questions = missed.filter((m) => /\?/.test(m.text || '')).length
    const bits = [mentions && `${mentions} te ${mentions === 1 ? 'menciona' : 'mencionan'}`, important && `${important} ${important === 1 ? 'importante' : 'importantes'}`, polls && `${polls} ${polls === 1 ? 'encuesta' : 'encuestas'}`, files && `${files} ${files === 1 ? 'archivo' : 'archivos'}`, questions && `${questions} ${questions === 1 ? 'pregunta' : 'preguntas'}`].filter(Boolean)
    const last = missed[missed.length - 1]
    catchUp = { count: missed.length, who, bits, last }
  }

  let lastDay = null

  return (
    <HighlightContext.Provider value={q || ""}>
    <div className="relative flex min-h-0 flex-1 flex-col">
    {floatDay && <div className="pointer-events-none absolute left-0 right-0 top-2 z-20 flex justify-center md:hidden"><span className="ador-pop-in rounded-full bg-[#2C2C2E]/90 px-3 py-1 text-[12px] font-medium text-[#E4E4E4] backdrop-blur-md">{floatDay}</span></div>}
    <div ref={scrollRef} onScroll={onScroll} data-keep-scroll className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-1 pb-0 pt-4 md:pb-4">
      {hasMore && !q && (
        <button type="button" onClick={loadOlder} className="mx-auto mb-3 rounded-full border border-white/[0.1] px-3 py-1 text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
          Cargar mensajes anteriores
        </button>
      )}
      {catchUp && (
        <div className="mx-1 mb-4 rounded-[20px] bg-white/[0.06] px-4 py-3.5">
          <p className="text-[13px] font-medium text-[#F4EEE2]">Lo que te perdiste</p>
          <p className="mt-1 text-[14.5px] leading-snug text-[#E4E4E4]">
            {catchUp.count} mensajes nuevos de {catchUp.who}
            {catchUp.bits.length > 0 && <span className="text-[#9A9A9A]"> · {catchUp.bits.join(' · ')}</span>}
          </p>
          {catchUp.last?.text && <p className="mt-1 line-clamp-1 text-[13px] text-[#8E8E93]">Último: {catchUp.last.authorName?.split(' ')[0]}: {catchUp.last.text}</p>}
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={() => document.getElementById('chat-new-divider')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded-full bg-[#F5F5F5] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0A0A0A]">Ir a lo nuevo</button>
            <button type="button" onClick={() => setCatchHidden(true)} className="rounded-full px-3 py-1.5 text-[12.5px] text-[#8E8E93]">Ocultar</button>
          </div>
        </div>
      )}
      {q && (
        <div className="sticky top-0 z-10 mb-3 flex items-center gap-1 self-start rounded-full border border-white/[0.12] bg-[#1C1C1E] py-1 pl-3.5 pr-1 text-[12.5px] text-[#CFCFCF]" role="status" aria-live="polite">
          <span className="mr-1">{matchIds.length ? `${Math.min(matchIdx, matchIds.length - 1) + 1} de ${matchIds.length}` : 'Sin coincidencias en los mensajes cargados'}</span>
          {matchIds.length > 1 && (
            <>
              <button type="button" aria-label="Coincidencia anterior" onClick={() => setMatchIdx((i) => (i - 1 + matchIds.length) % matchIds.length)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/[0.08]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
              </button>
              <button type="button" aria-label="Coincidencia siguiente" onClick={() => setMatchIdx((i) => (i + 1) % matchIds.length)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/[0.08]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </>
          )}
        </div>
      )}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MessageIcon size={20} className="text-[#8A8A8A]" />
          <p className="text-[13.5px] text-[#8A8A8A]">Sin mensajes todavía — escribe el primero.</p>
        </div>
      ) : (
        shown.map((mi, i) => {
          if (skipIdx.has(i)) return null
          const al = albumAt.get(i)
          const m = al ? shown[al.to] : mi
          const mine = m.authorUid === currentUid
          const key = dayKey(m.createdAt)
          const showDivider = key && key !== lastDay
          lastDay = key
          const { start } = flags[i]
          const end = al ? flags[al.to].end : flags[i].end
          const gap = i === 0 ? 0 : start || showDivider ? 14 : 3
          return (
            <div key={m.id} id={`msg-${m.id}`} data-day={dayLabel(m.createdAt)} className={`flex flex-col ${isNew(m.id) ? (mine ? 'ador-msg-send' : 'ador-msg-in') : ''}`} style={{ marginTop: gap }}>
              {showDivider && <DateDivider ts={m.createdAt} />}
              {i === firstNewIndex && <NewDivider />}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble
                  message={m}
                  album={al?.msgs}
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
                  onOpenEntity={onOpenEntity}
                  onReply={onReply ? () => onReply(m) : null}
                  onForward={onForward ? () => onForward(m) : null}
                  onJump={onJump}
                  onVote={onVote ? (optionId) => onVote(m, optionId) : null}
                  onClosePoll={onClosePoll ? (closed) => onClosePoll(m, closed) : null}
                  onAck={onAck ? () => onAck(m) : null}
                  audienceUids={audienceUids}
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
    {!atBottom && unseen > 0 && !q && (
      <button
        type="button"
        onClick={scrollToBottom}
        className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#F4EEE2]/50 bg-[#1C1A16] px-3.5 py-1.5 text-[12.5px] font-medium text-[#F4EEE2] shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition-colors hover:bg-[#26231E]"
      >
        ↓ {unseen} {unseen === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
      </button>
    )}
    </div>
    </HighlightContext.Provider>
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
              className="ml-3 text-[#F4EEE2] hover:underline"
            >
              {copied || 'Copiar imagen'}
            </button>
            <a href={src} download={attachment.name} onClick={(e) => e.stopPropagation()} className="ml-3 text-[#F4EEE2] hover:underline">
              Descargar
            </a>
          </>
        )}
      </p>
    </div>,
    document.body
  )
}


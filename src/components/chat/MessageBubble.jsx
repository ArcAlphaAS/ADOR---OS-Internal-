import { useEffect, useRef, useState } from 'react'
import { findDriveLink, driveDocType, splitLinks, splitFormatting, splitMentions, QUICK_REACTIONS, callState, reminderOptions } from '../../lib/chat'
import { getChatBlob, subscribeChatCall, respondToChatCall, setChatCallStatus } from '../../lib/firestore'
import { EditIcon, CloseIcon, FileIcon, FolderIcon, PhoneIcon, VideoIcon, SmileIcon, BookmarkIcon, PlayIcon, PauseIcon } from '../icons'
import PersonAvatar from './PersonAvatar'

// One message in a conversation: its bubble, attachments (image, voice,
// call card, Drive document), reactions, receipts, thread summary and the
// hover actions. Split out of ChatThread.jsx to keep each file focused.

// Graphite and gold (user's choice over the generic bright blue): your
// own messages are warm graphite with a thin gold edge, and gold marks
// what's yours or new — unread, mentions of you, read receipts, send.
const MINE_BG = '#1C1A16'
const MINE_BORDER = 'rgba(184,134,11,0.42)'

function formatTime(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}


export function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Heavy payloads are fetched once per session and kept here, so replaying
// a voice note or reopening an image never re-downloads it.
const blobCache = new Map()
export function loadBlob(blobId) {
  if (!blobCache.has(blobId)) blobCache.set(blobId, getChatBlob(blobId))
  return blobCache.get(blobId)
}

// ---- Rich text: links → mentions → formatting, all as React nodes ----
function Formatted({ text }) {
  return splitFormatting(text).map((part, i) => {
    if (part.type === 'bold') return <strong key={i} className="font-semibold">{part.value}</strong>
    if (part.type === 'italic') return <em key={i}>{part.value}</em>
    if (part.type === 'strike') return <s key={i} className="opacity-70">{part.value}</s>
    if (part.type === 'code')
      return (
        <code key={i} className="rounded bg-black/30 px-1 py-px font-mono text-[12.5px]">
          {part.value}
        </code>
      )
    return <span key={i}>{part.value}</span>
  })
}

function RichText({ text, mentions, currentUid }) {
  return splitLinks(text).map((part, i) =>
    part.type === 'link' ? (
      <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-white/30 underline-offset-2 hover:decoration-white/70">
        {part.value}
      </a>
    ) : (
      <span key={i}>
        {splitMentions(part.value, mentions).map((seg, j) =>
          seg.type === 'mention' ? (
            <span
              key={j}
              className="rounded px-0.5 font-medium"
              style={seg.uid === currentUid ? { background: 'rgba(184,134,11,0.25)', color: '#E8C15A' } : { background: 'rgba(255,255,255,0.1)', color: '#F2EBDD' }}
            >
              {seg.value}
            </span>
          ) : (
            <Formatted key={j} text={seg.value} />
          )
        )}
      </span>
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
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(184,134,11,0.14)', color: '#E8C15A' }}>
        {type === 'Carpeta' ? <FolderIcon size={16} /> : <FileIcon size={16} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium text-[#F5F5F5]">{type} en Google Drive</span>
        <span className="block text-[11px] text-[#B8860B]">Documento oficial · abrir en Drive</span>
      </span>
    </a>
  )
}

// Images carry only a small thumbnail inline; the full-size version sits in
// chatBlobs and loads when clicked. Older image messages (before the split)
// have the full `dataUrl` inline and still render the same way.
function ImageAttachment({ attachment, onOpen }) {
  const src = attachment.thumbUrl || attachment.dataUrl
  return (
    <button type="button" onClick={() => onOpen(attachment)} className="block text-left">
      <img src={src} alt={attachment.name || 'Imagen'} loading="lazy" className="max-h-[240px] max-w-[300px] rounded-xl border border-white/[0.08] object-cover" />
      <span className="mt-1 block px-1 text-[11px] text-[#7A7A7A]">Archivo de conversación · {attachment.name}</span>
    </button>
  )
}

function VoiceNote({ attachment, mine }) {
  const audioRef = useRef(null)
  const [state, setState] = useState('idle') // idle | loading | playing | paused
  const [progress, setProgress] = useState(0)

  useEffect(() => () => audioRef.current?.pause(), [])

  const toggle = async () => {
    if (state === 'playing') {
      audioRef.current.pause()
      setState('paused')
      return
    }
    if (!audioRef.current) {
      setState('loading')
      const dataUrl = await loadBlob(attachment.blobId).catch(() => null)
      if (!dataUrl) return setState('idle')
      const audio = new Audio(dataUrl)
      audio.ontimeupdate = () => setProgress(audio.currentTime / (attachment.duration || audio.duration || 1))
      audio.onended = () => {
        setState('idle')
        setProgress(0)
      }
      audioRef.current = audio
    }
    await audioRef.current.play().catch(() => {})
    setState('playing')
  }

  return (
    <div className="flex w-[240px] items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: mine ? MINE_BG : 'rgba(255,255,255,0.06)', border: mine ? `1px solid ${MINE_BORDER}` : '1px solid transparent' }}>
      <button type="button" onClick={toggle} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.15] text-white">
        {state === 'playing' ? <PauseIcon size={14} /> : state === 'loading' ? <span className="h-3 w-3 animate-spin rounded-full border border-white/60 border-t-transparent" /> : <PlayIcon size={12} />}
      </button>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.2]">
        <div className="h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
      <span className="flex-shrink-0 text-[11px] text-white/80">{formatDuration(attachment.duration)}</span>
    </div>
  )
}

const CALL_TONE = {
  ringing: { color: '#4CAF50', bg: 'rgba(76,175,80,0.14)' },
  active: { color: '#4CAF50', bg: 'rgba(76,175,80,0.14)' },
  missed: { color: '#EF5350', bg: 'rgba(239,83,80,0.12)' },
  declined: { color: '#EF5350', bg: 'rgba(239,83,80,0.12)' },
  cancelled: { color: '#888888', bg: 'rgba(255,255,255,0.05)' },
  ended: { color: '#888888', bg: 'rgba(255,255,255,0.05)' },
  unknown: { color: '#888888', bg: 'rgba(255,255,255,0.05)' },
}

// Only recent calls keep a live listener on their chatCalls doc; older
// cards in a long thread render from the message alone.
const LIVE_CALL_MS = 6 * 60 * 60 * 1000

// Teams-style call card: its state changes live in the thread —
// Llamando… → En curso (with who's in) → Finalizada · 12 min, or
// Perdida / Rechazada / Cancelada. Unirse from the card also counts you in.
function CallCard({ call, authorName, mine, createdAt, currentUid, userName }) {
  const [callDoc, setCallDoc] = useState(null)
  const [, setTick] = useState(0)
  const live = call.callId && (!createdAt?.toMillis || Date.now() - createdAt.toMillis() < LIVE_CALL_MS)

  useEffect(() => (live ? subscribeChatCall(call.callId, setCallDoc) : undefined), [live, call.callId])

  const state = callDoc ? callState(callDoc, currentUid) : { key: call.callId ? 'unknown' : 'legacy', label: '' }
  // Re-check every few seconds while ringing so it flips to "perdida" on time.
  useEffect(() => {
    if (state.key !== 'ringing') return
    const t = setInterval(() => setTick((n) => n + 1), 3000)
    return () => clearInterval(t)
  }, [state.key])

  const video = call.type === 'video'
  const tone = CALL_TONE[state.key] || CALL_TONE.unknown
  const canJoin = !callDoc || state.key === 'ringing' || state.key === 'active'
  const joined = callDoc?.joinedUids?.includes(currentUid)
  const title = `${video ? 'Videollamada' : 'Llamada'}${state.label && state.key !== 'unknown' ? ` ${state.label}` : ''}`
  const subtitle =
    state.key === 'active'
      ? `${(state.joined || []).map((uid) => (userName(uid) || '').split(' ')[0]).join(', ')} ${state.joined.length === 1 ? 'está' : 'están'} en la llamada`
      : `${mine ? 'Iniciaste' : `${authorName} inició`} una reunión en Google Meet`

  const join = () => {
    if (call.callId && !joined) respondToChatCall(call.callId, currentUid, 'joined').catch(() => {})
    window.open(call.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex w-[300px] flex-col gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-3">
      <div className="flex items-center gap-3">
        <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: tone.bg, color: tone.color }}>
          {state.key === 'ringing' && <span className="absolute inset-0 rounded-full" style={{ background: tone.bg, animation: 'ador-pulse 1.4s ease-in-out infinite' }} />}
          {video ? <VideoIcon size={16} /> : <PhoneIcon size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium" style={{ color: state.key === 'missed' || state.key === 'declined' ? '#EF8A88' : '#F5F5F5' }}>
            {title}
          </span>
          <span className="block truncate text-[11px] text-[#858585]">{subtitle}</span>
        </span>
      </div>
      {(canJoin || (mine && state.key === 'ringing')) && (
        <div className="flex items-center gap-2">
          {canJoin && (
            <button type="button" onClick={join} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-white" style={{ background: '#4CAF50' }}>
              {joined ? 'Volver a la llamada' : 'Unirse'}
            </button>
          )}
          {mine && state.key === 'ringing' && (
            <button type="button" onClick={() => setChatCallStatus(call.callId, 'cancelled', currentUid).catch(() => {})} className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12.5px] text-[#CCCCCC] hover:text-[#F5F5F5]">
              Cancelar
            </button>
          )}
          {state.key === 'active' && joined && (
            <button type="button" onClick={() => setChatCallStatus(call.callId, 'ended', currentUid).catch(() => {})} className="ml-auto rounded-full border border-[#EF5350]/40 px-3 py-1.5 text-[12.5px] text-[#EF8A88] hover:bg-[#EF5350]/10">
              Finalizar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Reactions({ reactions, currentUid, userName, onReact }) {
  const entries = Object.entries(reactions || {}).filter(([, uids]) => uids?.length)
  if (!entries.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([emoji, uids]) => {
        const mine = uids.includes(currentUid)
        return (
          <button
            key={emoji}
            type="button"
            title={uids.map(userName).join(', ')}
            onClick={() => onReact(emoji, mine)}
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12.5px] transition-colors"
            style={{
              borderColor: mine ? 'rgba(184,134,11,0.6)' : 'rgba(255,255,255,0.1)',
              background: mine ? 'rgba(184,134,11,0.18)' : 'rgba(255,255,255,0.03)',
              color: '#DDDDDD',
            }}
          >
            {emoji} <span className="text-[11px]">{uids.length}</span>
          </button>
        )
      })}
    </div>
  )
}

// ✓ sent · ✓✓ read (blue) · a small clock while the server hasn't
// confirmed it yet. Hover says who has read it in a group.
function Ticks({ receipt, userName }) {
  if (!receipt) return null
  if (receipt.state === 'sending') return <span className="text-[10px] text-[#7A7A7A]" title="Enviando">◷</span>
  const read = receipt.state === 'read'
  const title = read ? 'Leído' : receipt.readers.length ? `Leído por ${receipt.readers.map(userName).join(', ')}` : 'Enviado'
  return (
    <span title={title} className="inline-flex items-center" style={{ color: read ? '#E8C15A' : '#858585' }}>
      <svg width={read ? 16 : 11} height="10" viewBox={read ? '0 0 16 10' : '0 0 11 10'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 5.2 3.8 8 10 1.8" />
        {read && <path d="M6.5 7.3 7.2 8 13.4 1.8" />}
      </svg>
    </span>
  )
}

function timeAgoShort(ts) {
  if (!ts?.toMillis) return ''
  const min = Math.floor((Date.now() - ts.toMillis()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  return ts.toDate().toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// Slack's thread summary under a message: who's in it, how many replies,
// when the last one landed. Click opens the thread panel.
function ThreadSummary({ message, userName, onOpen }) {
  if (!message.replyCount) return null
  const uids = (message.replyUids || []).slice(0, 4)
  return (
    <button type="button" onClick={onOpen} className="group/thread flex items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/[0.04]">
      <span className="flex -space-x-1.5">
        {uids.map((uid) => (
          <span key={uid} className="rounded-full ring-2 ring-[#0A0A0A]">
            <PersonAvatar uid={uid} name={userName(uid)} size={18} />
          </span>
        ))}
      </span>
      <span className="whitespace-nowrap text-[12.5px] font-medium text-[#E8C15A] group-hover/thread:underline">
        {message.replyCount} {message.replyCount === 1 ? 'respuesta' : 'respuestas'}
      </span>
      <span className="whitespace-nowrap text-[11px] text-[#7A7A7A]">Última {timeAgoShort(message.lastReplyAt)}</span>
    </button>
  )
}

function ActionIcon({ title, onClick, children, danger, active }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
      style={{ color: danger ? '#EF5350' : active ? '#E8C15A' : '#888888' }}
    >
      {children}
    </button>
  )
}

// Hover reveals the message's actions — react, save, and (your own) edit
// and delete. All inline in the row, never a floating menu, so nothing
// needs portaling. Call cards and media can be deleted but not edited.
export function MessageBubble({ message, mine, groupStart = true, groupEnd = true, showAvatar = false, currentUid, saved, userName, userPhoto, receipt, onEdit, onDelete, onOpenProfile, onReact, onToggleSave, onOpenImage, onOpenThread, pinned, onTogglePin, onRemind, onCreateTask, onOpenTask }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picking, setPicking] = useState(false)
  // 'more' = the ⋯ menu (fijar · recordar · tarea); 'remind' = its time picker
  const [menu, setMenu] = useState(null)
  const driveUrl = findDriveLink(message.text)
  const hasText = Boolean(message.text)
  // A message that's nothing but a Drive link shows just the card — the
  // raw URL in a bubble above it would say the same thing twice.
  const showBubble = hasText && message.text.trim() !== driveUrl

  if (editing) {
    return (
      <div className="flex max-w-[70%] flex-col items-end gap-1">
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
              e.preventDefault()
              onEdit(draft.trim())
              setEditing(false)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-[360px] resize-none rounded-2xl border border-white/[0.2] bg-[#141414] px-3.5 py-2 text-[13.5px] text-[#F5F5F5] outline-none"
        />
        <p className="px-1 text-[11px] text-[#858585]">Enter para guardar · Esc para cancelar</p>
      </div>
    )
  }

  const menuButton = (label, onClick) => (
    <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] text-[#CCCCCC] hover:bg-white/[0.08] hover:text-[#F5F5F5]">
      {label}
    </button>
  )

  const actions = menu ? (
    // Inline, in the row itself — never a floating menu (no portal needed).
    <span className="flex flex-wrap items-center gap-0.5 rounded-2xl border border-white/[0.1] bg-[#141414] px-1 py-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
      {menu === 'more' ? (
        <>
          {onTogglePin &&
            menuButton(pinned ? 'Desfijar' : 'Fijar', () => {
              onTogglePin()
              setMenu(null)
            })}
          {onRemind && menuButton('Recordármelo', () => setMenu('remind'))}
          {onCreateTask &&
            !message.task &&
            menuButton('Crear tarea', () => {
              onCreateTask()
              setMenu(null)
            })}
        </>
      ) : (
        reminderOptions().map((o) =>
          menuButton(o.label, () => {
            onRemind(o.at)
            setMenu(null)
          })
        )
      )}
      <button type="button" onClick={() => setMenu(null)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#858585] hover:text-[#F5F5F5]">
        <CloseIcon size={10} />
      </button>
    </span>
  ) : (
    <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-white/[0.08] bg-[#141414] px-1 py-0.5 opacity-0 shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100">
      {/* Inside a group only the last message shows its time; the others
          reveal theirs on hover, like Slack. */}
      {!groupEnd && <span className="px-1 text-[11px] text-[#8A8A8A]">{formatTime(message.createdAt)}</span>}
      {picking ? (
        <span className="flex items-center gap-0.5 rounded-full border border-white/[0.1] bg-[#141414] px-1 py-0.5">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onReact(e, (message.reactions?.[e] || []).includes(currentUid))
                setPicking(false)
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[15px] hover:bg-white/[0.08]"
            >
              {e}
            </button>
          ))}
        </span>
      ) : (
        <ActionIcon title="Reaccionar" onClick={() => setPicking(true)}>
          <SmileIcon size={14} />
        </ActionIcon>
      )}
      {onOpenThread && (
        <ActionIcon title="Responder en hilo" onClick={onOpenThread}>
          <ThreadIcon />
        </ActionIcon>
      )}
      <ActionIcon title={saved ? 'Quitar de guardados' : 'Guardar mensaje'} onClick={onToggleSave} active={saved}>
        <BookmarkIcon size={13} filled={saved} />
      </ActionIcon>
      {(onTogglePin || onRemind || onCreateTask) && (
        <ActionIcon title="Más: fijar, recordármelo, crear tarea" onClick={() => setMenu('more')}>
          <span className="text-[15px] leading-none">⋯</span>
        </ActionIcon>
      )}
      {mine && hasText && !message.call && (
        <ActionIcon title="Editar" onClick={() => setEditing(true)}>
          <EditIcon size={12} />
        </ActionIcon>
      )}
      {mine && (
        <span onBlur={() => setConfirmDelete(false)}>
          <ActionIcon title={confirmDelete ? 'Clic otra vez para eliminar' : 'Eliminar'} danger={confirmDelete} onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
            <CloseIcon size={11} />
          </ActionIcon>
        </span>
      )}
    </span>
  )

  // Others' messages in channels and groups carry the author's face at the
  // top of each block (a spacer keeps the rest of the block aligned); DMs
  // skip it — it's always the same person.
  const avatarColumn =
    !mine && showAvatar ? (
      groupStart ? (
        <button type="button" onClick={() => onOpenProfile(message.authorUid)} className="mt-0.5 flex-shrink-0" title={message.authorName}>
          <PersonAvatar uid={message.authorUid} name={message.authorName} size={28} />
        </button>
      ) : (
        <span className="w-7 flex-shrink-0" />
      )
    ) : null

  return (
    <div className={`group flex max-w-[75%] gap-2 ${mine ? 'flex-row-reverse' : ''}`} onMouseLeave={() => {
        setPicking(false)
        setMenu(null)
      }}>
      {avatarColumn}
      <div className={`flex min-w-0 flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      {!mine && groupStart && showAvatar && (
        <button type="button" onClick={() => onOpenProfile(message.authorUid)} className="px-1 text-[12.5px] font-semibold text-[#CFC6B8] hover:underline">
          {message.authorName}
        </button>
      )}
      {/* Slack-style: the hover actions float over the bubble's top edge
          (absolute), anchored to the side with room — they used to sit in
          the row and took width even while invisible, squeezing the bubble
          in narrow layouts. */}
      <div className="relative flex items-center">
        <div
          className={`absolute -top-4 z-10 max-w-[420px] ${mine ? 'right-0' : 'left-0'} ${menu ? '' : 'pointer-events-none group-hover:pointer-events-auto'}`}
        >
          {actions}
        </div>
        <div className={`flex flex-col gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
          {message.call && <CallCard call={message.call} authorName={message.authorName} mine={mine} createdAt={message.createdAt} currentUid={currentUid} userName={userName} />}
          {message.attachment?.kind === 'image' && <ImageAttachment attachment={message.attachment} onOpen={onOpenImage} />}
          {message.attachment?.kind === 'voice' && <VoiceNote attachment={message.attachment} mine={mine} />}
          {showBubble && (
            <div
              className="whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed"
              style={{
                background: mine ? MINE_BG : 'rgba(255,255,255,0.06)',
                border: mine ? `1px solid ${MINE_BORDER}` : '1px solid transparent',
                color: mine ? '#F2EBDD' : '#DDDDDD',
                // Only the last bubble of a block gets the "tail" corner;
                // bubbles inside a block keep softer inner corners.
                borderTopRightRadius: mine && !groupStart ? 6 : undefined,
                borderBottomRightRadius: mine ? (groupEnd ? 4 : 6) : undefined,
                borderTopLeftRadius: !mine && !groupStart ? 6 : undefined,
                borderBottomLeftRadius: !mine ? (groupEnd ? 4 : 6) : undefined,
              }}
            >
              <RichText text={message.text} mentions={message.mentions} currentUid={currentUid} />
            </div>
          )}
          {driveUrl && <DriveCard url={driveUrl} />}
          {message.task && (
            <button
              type="button"
              onClick={() => onOpenTask?.(message.task.id)}
              className="flex items-center gap-1.5 rounded-full border border-[#4CAF50]/30 bg-[#4CAF50]/[0.08] px-2.5 py-1 text-[11px] text-[#8FD19A] hover:border-[#4CAF50]/60"
              title="Abrir en Workspace"
            >
              ✓ Tarea: <span className="max-w-[200px] truncate">{message.task.title}</span>
            </button>
          )}
        </div>
      </div>
      <Reactions reactions={message.reactions} currentUid={currentUid} userName={userName} onReact={onReact} />
      {onOpenThread && <ThreadSummary message={message} userPhoto={userPhoto} userName={userName} onOpen={onOpenThread} />}
      {(groupEnd || message.editedAt || pinned) && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-[#8A8A8A]">
          {groupEnd && formatTime(message.createdAt)}
          {message.editedAt ? `${groupEnd ? ' ' : ''}(editado)` : ''}
          {pinned && <span className="text-[#E8C15A]" title="Mensaje fijado">📌</span>}
          {mine && <Ticks receipt={receipt} userName={userName} />}
        </p>
      )}
      </div>
    </div>
  )
}

function ThreadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16v10H11l-4 3.5v-3.5H4v-10Z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  )
}


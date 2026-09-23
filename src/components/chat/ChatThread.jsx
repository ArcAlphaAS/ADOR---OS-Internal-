import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  findDriveLink,
  driveDocType,
  splitLinks,
  splitFormatting,
  splitMentions,
  mentionQueryAt,
  EMOJIS,
  QUICK_REACTIONS,
  FORMATS,
  callState,
  reminderOptions,
} from '../../lib/chat'
import { getChatBlob, subscribeChatCall, respondToChatCall, setChatCallStatus } from '../../lib/firestore'
import { resizeImageToDataUrl } from '../../lib/image'
import Avatar from '../shell/Avatar'
import {
  MessageIcon,
  ArrowRightIcon,
  EditIcon,
  CloseIcon,
  PaperclipIcon,
  ImageIcon,
  FileIcon,
  FolderIcon,
  PhoneIcon,
  VideoIcon,
  SmileIcon,
  MicIcon,
  BookmarkIcon,
  PlayIcon,
  PauseIcon,
} from '../icons'

// Graphite and gold (user's choice over the generic bright blue): your
// own messages are warm graphite with a thin gold edge, and gold marks
// what's yours or new — unread, mentions of you, read receipts, send.
const MINE_BG = '#1C1A16'
const MINE_BORDER = 'rgba(184,134,11,0.42)'

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

function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Heavy payloads are fetched once per session and kept here, so replaying
// a voice note or reopening an image never re-downloads it.
const blobCache = new Map()
function loadBlob(blobId) {
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
      <span className="mt-1 block px-1 text-[10.5px] text-[#555555]">Archivo de conversación · {attachment.name}</span>
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
          <span className="block truncate text-[11px] text-[#666666]">{subtitle}</span>
        </span>
      </div>
      {(canJoin || (mine && state.key === 'ringing')) && (
        <div className="flex items-center gap-2">
          {canJoin && (
            <button type="button" onClick={join} className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-white" style={{ background: '#4CAF50' }}>
              {joined ? 'Volver a la llamada' : 'Unirse'}
            </button>
          )}
          {mine && state.key === 'ringing' && (
            <button type="button" onClick={() => setChatCallStatus(call.callId, 'cancelled', currentUid).catch(() => {})} className="rounded-full border border-white/[0.12] px-3 py-1.5 text-[12px] text-[#CCCCCC] hover:text-[#F5F5F5]">
              Cancelar
            </button>
          )}
          {state.key === 'active' && joined && (
            <button type="button" onClick={() => setChatCallStatus(call.callId, 'ended', currentUid).catch(() => {})} className="ml-auto rounded-full border border-[#EF5350]/40 px-3 py-1.5 text-[12px] text-[#EF8A88] hover:bg-[#EF5350]/10">
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
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-colors"
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
  if (receipt.state === 'sending') return <span className="text-[10px] text-[#555555]" title="Enviando">◷</span>
  const read = receipt.state === 'read'
  const title = read ? 'Leído' : receipt.readers.length ? `Leído por ${receipt.readers.map(userName).join(', ')}` : 'Enviado'
  return (
    <span title={title} className="inline-flex items-center" style={{ color: read ? '#E8C15A' : '#666666' }}>
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
function ThreadSummary({ message, userPhoto, userName, onOpen }) {
  if (!message.replyCount) return null
  const uids = (message.replyUids || []).slice(0, 4)
  return (
    <button type="button" onClick={onOpen} className="group/thread flex items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/[0.04]">
      <span className="flex -space-x-1.5">
        {uids.map((uid) => (
          <span key={uid} className="rounded-full ring-2 ring-[#0A0A0A]">
            <Avatar displayName={userName(uid)} photoURL={userPhoto(uid)} size={18} />
          </span>
        ))}
      </span>
      <span className="whitespace-nowrap text-[12px] font-medium text-[#E8C15A] group-hover/thread:underline">
        {message.replyCount} {message.replyCount === 1 ? 'respuesta' : 'respuestas'}
      </span>
      <span className="whitespace-nowrap text-[11px] text-[#555555]">Última {timeAgoShort(message.lastReplyAt)}</span>
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
export function MessageBubble({ message, mine, currentUid, saved, userName, userPhoto, receipt, onEdit, onDelete, onOpenProfile, onReact, onToggleSave, onOpenImage, onOpenThread, pinned, onTogglePin, onRemind, onCreateTask, onOpenTask }) {
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
        <p className="px-1 text-[10.5px] text-[#666666]">Enter para guardar · Esc para cancelar</p>
      </div>
    )
  }

  const menuButton = (label, onClick) => (
    <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] text-[#CCCCCC] hover:bg-white/[0.08] hover:text-[#F5F5F5]">
      {label}
    </button>
  )

  const actions = menu ? (
    // Inline, in the row itself — never a floating menu (no portal needed).
    <span className="flex items-center gap-0.5 rounded-full border border-white/[0.1] bg-[#141414] px-1 py-0.5">
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
      <button type="button" onClick={() => setMenu(null)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#666666] hover:text-[#F5F5F5]">
        <CloseIcon size={10} />
      </button>
    </span>
  ) : (
    <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
              className="flex h-6 w-6 items-center justify-center rounded-full text-[14px] hover:bg-white/[0.08]"
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
          <span className="text-[14px] leading-none">⋯</span>
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

  return (
    <div className={`group flex max-w-[75%] flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`} onMouseLeave={() => {
        setPicking(false)
        setMenu(null)
      }}>
      {!mine && (
        <button type="button" onClick={() => onOpenProfile(message.authorUid)} className="px-1 text-[11px] font-medium text-[#666666] hover:text-[#F5F5F5] hover:underline">
          {message.authorName}
        </button>
      )}
      <div className={`flex items-center gap-1.5 ${mine ? '' : 'flex-row-reverse'}`}>
        {actions}
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
                borderBottomRightRadius: mine ? 4 : undefined,
                borderBottomLeftRadius: mine ? undefined : 4,
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
      <p className="flex items-center gap-1.5 px-1 text-[10.5px] text-[#444444]">
        {formatTime(message.createdAt)}
        {message.editedAt ? ' (editado)' : ''}
        {pinned && <span className="text-[#E8C15A]" title="Mensaje fijado">📌</span>}
        {mine && <Ticks receipt={receipt} userName={userName} />}
      </p>
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

function DateDivider({ ts }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[11px] font-medium text-[#555555]">{dayLabel(ts)}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

export function MessageThread({ messages, currentUid, query, hasMore, onLoadMore, savedIds, userName, userPhoto, receiptFor, onEdit, onDelete, onOpenProfile, onReact, onToggleSave, onOpenImage, onOpenThread, pinnedIds, onTogglePin, onRemind, onCreateTask, onOpenTask }) {
  const scrollRef = useRef(null)
  const loadingOlderRef = useRef(null)
  const q = query?.trim().toLowerCase()
  const shown = q ? messages.filter((m) => (m.text || '').toLowerCase().includes(q) || (m.attachment?.name || '').toLowerCase().includes(q)) : messages
  const lastId = messages[messages.length - 1]?.id

  // Stick to the bottom when a new message arrives or search changes —
  // but when older messages were just loaded above, keep the reader's
  // place instead of jumping them back down.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (loadingOlderRef.current !== null) {
      el.scrollTop = el.scrollHeight - loadingOlderRef.current
      loadingOlderRef.current = null
      return
    }
    el.scrollTop = el.scrollHeight
  }, [lastId, messages.length, q])

  const loadOlder = () => {
    loadingOlderRef.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop
    onLoadMore()
  }

  let lastDay = null

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-4">
      {hasMore && !q && (
        <button type="button" onClick={loadOlder} className="mx-auto rounded-full border border-white/[0.1] px-3 py-1 text-[11.5px] text-[#888888] hover:text-[#F5F5F5]">
          Cargar mensajes anteriores
        </button>
      )}
      {q && (
        <p className="px-1 text-[11.5px] text-[#666666]">
          {shown.length ? `${shown.length} ${shown.length === 1 ? 'mensaje coincide' : 'mensajes coinciden'} con “${query.trim()}”` : `Nada coincide con “${query.trim()}” en los mensajes cargados.`}
        </p>
      )}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MessageIcon size={20} className="text-[#333333]" />
          <p className="text-[13px] text-[#444444]">Sin mensajes todavía — escribe el primero.</p>
        </div>
      ) : (
        shown.map((m) => {
          const mine = m.authorUid === currentUid
          const key = dayKey(m.createdAt)
          const showDivider = key && key !== lastDay
          lastDay = key
          return (
            <div key={m.id} id={`msg-${m.id}`} className="flex flex-col gap-3">
              {showDivider && <DateDivider ts={m.createdAt} />}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <MessageBubble
                  message={m}
                  mine={mine}
                  currentUid={currentUid}
                  saved={savedIds.has(m.id)}
                  userName={userName}
                  userPhoto={userPhoto}
                  receipt={mine && receiptFor ? receiptFor(m) : null}
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

// Full-size image viewer. Chrome refuses to open a data: URL in a new tab,
// so images open here instead of via target="_blank".
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
      <p className="text-[12px] text-[#AAAAAA]">
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

// Firestore caps a document at 1MB; full-size images and voice notes live
// in their own chatBlobs doc, so each can use most of that on its own.
const MAX_BLOB_CHARS = 900_000
const MAX_VOICE_SECONDS = 60

function ToolButton({ title, onClick, active, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-[#888888] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
      style={active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
    >
      {children}
    </button>
  )
}

function useVoiceRecorder({ onDone, onError }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recRef = useRef(null)
  const cancelRef = useRef(false)

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return onError('Este navegador no permite grabar audio.')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return onError('Necesitamos permiso para usar el micrófono.')
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
    const rec = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })
    const chunks = []
    const startedAt = Date.now()
    cancelRef.current = false
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
      if (cancelRef.current) return
      const duration = (Date.now() - startedAt) / 1000
      if (duration < 1) return
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result.length > MAX_BLOB_CHARS) return onError('La nota de voz es demasiado larga.')
        onDone({ dataUrl: reader.result, duration })
      }
      reader.readAsDataURL(new Blob(chunks, { type: rec.mimeType }))
    }
    rec.start()
    recRef.current = rec
    setSeconds(0)
    setRecording(true)
  }

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_VOICE_SECONDS) recRef.current?.stop()
        return s + 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [recording])

  useEffect(
    () => () => {
      if (recRef.current?.state === 'recording') {
        cancelRef.current = true
        recRef.current.stop()
      }
    },
    []
  )

  return {
    recording,
    seconds,
    start,
    stop: () => recRef.current?.stop(),
    cancel: () => {
      cancelRef.current = true
      recRef.current?.stop()
    },
  }
}

// The composer, following the reference layout: text in the middle, tools
// on the right (Aa formato · emoji · adjuntar · imagen · voz) and send.
// Every panel it opens (format bar, emoji grid, attach options, @-mention
// suggestions) sits in normal flow directly above the input — nothing
// floats, so nothing needs a portal. The reference's separate "+" was left
// out: it duplicated the paperclip.
export function Composer({ onSend, onError, onTyping, mentionCandidates = [], placeholder, compact }) {
  const [text, setText] = useState('')
  const [panel, setPanel] = useState(null) // 'format' | 'emoji' | 'attach' | null
  const [driveMode, setDriveMode] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [mentions, setMentions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  const inputRef = useRef(null)
  const lastTypingRef = useRef(0)

  // "Escribiendo…" signal, throttled to one write every 3s while typing.
  const signalTyping = (value) => {
    if (!onTyping) return
    const now = Date.now()
    if (value.trim() && now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now
      onTyping(true)
    }
  }
  const voice = useVoiceRecorder({ onDone: (v) => onSend({ voice: v }), onError })

  const suggestions = mentionQuery
    ? mentionCandidates.filter((c) => c.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).slice(0, 5)
    : []

  // Auto-grow up to ~6 lines, then scroll inside.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [text])

  const reset = () => {
    if (lastTypingRef.current) {
      lastTypingRef.current = 0
      onTyping?.(false)
    }
    setText('')
    setPendingImage(null)
    setDriveMode(false)
    setPanel(null)
    setMentions([])
    setMentionQuery(null)
  }

  const submit = () => {
    if (driveMode && !findDriveLink(text)) return onError('Pega un enlace de Google Drive, Docs, Sheets o Slides.')
    if (!text.trim() && !pendingImage) return
    const finalMentions = mentions.filter((m) => text.includes(`@${m.name}`))
    onSend({ text: text.trim(), image: pendingImage || undefined, mentions: finalMentions })
    reset()
  }

  const updateText = (value, cursor) => {
    setText(value)
    signalTyping(value)
    setMentionQuery(mentionCandidates.length ? mentionQueryAt(value, cursor) : null)
    setMentionIndex(0)
  }

  const insertMention = (candidate) => {
    const el = inputRef.current
    const cursor = el.selectionStart
    const before = text.slice(0, mentionQuery.start)
    const after = text.slice(cursor)
    const token = `@${candidate.name} `
    setText(before + token + after)
    setMentions((m) => (m.some((x) => x.uid === candidate.uid) ? m : [...m, { uid: candidate.uid, name: candidate.name }]))
    setMentionQuery(null)
    requestAnimationFrame(() => {
      el.focus()
      const pos = before.length + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const insertAtCursor = (str) => {
    const el = inputRef.current
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    setText(text.slice(0, start) + str + text.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + str.length, start + str.length)
    })
  }

  const applyFormat = (wrap) => {
    const el = inputRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end) || 'texto'
    setText(text.slice(0, start) + wrap + selected + wrap + text.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + wrap.length, start + wrap.length + selected.length)
    })
  }

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) attachImage(file)
  }

  // Ctrl+V / ⌘V of a screenshot or copied image, and drag-and-drop, both
  // land here — same compression path as the image button.
  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    attachImage(new File([file], file.name && file.name !== 'image.png' ? file.name : `Captura ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.png`, { type: file.type }))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'))
    if (file) attachImage(file)
    else if (e.dataTransfer?.files?.length) onError('Solo imágenes por ahora — los documentos oficiales se comparten desde Google Drive.')
  }

  const attachImage = async (file) => {
    if (!file.type.startsWith('image/')) return onError('Solo imágenes aquí — los documentos oficiales se comparten desde Google Drive.')
    setProcessing(true)
    try {
      const [thumbUrl, fullDataUrl] = await Promise.all([resizeImageToDataUrl(file, 480, 0.72), resizeImageToDataUrl(file, 1600, 0.82)])
      if (fullDataUrl.length > MAX_BLOB_CHARS) return onError('La imagen es demasiado pesada incluso comprimida. Prueba con una más pequeña.')
      setPendingImage({ thumbUrl, fullDataUrl, name: file.name })
      setPanel(null)
      inputRef.current?.focus()
    } catch (err) {
      onError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const togglePanel = (id) => setPanel((p) => (p === id ? null : id))

  if (voice.recording) {
    return (
      <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
        <div className="flex flex-1 items-center gap-3 rounded-full border border-[#EF5350]/40 bg-[#EF5350]/[0.06] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EF5350]" style={{ animation: 'ador-pulse 1.2s ease-in-out infinite' }} />
          <span className="text-[13px] text-[#F5F5F5]">Grabando nota de voz</span>
          <span className="ml-auto font-mono text-[12.5px] text-[#AAAAAA]">
            {formatDuration(voice.seconds)} / {formatDuration(MAX_VOICE_SECONDS)}
          </span>
        </div>
        <button type="button" onClick={voice.cancel} className="text-[12.5px] text-[#888888] hover:text-[#F5F5F5]">
          Cancelar
        </button>
        <button type="button" onClick={voice.stop} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: '#B8860B' }} title="Enviar nota de voz">
          <ArrowRightIcon size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col gap-2 ${compact ? '' : 'border-t border-white/[0.06]'} pt-3`}
      onDragOver={(e) => {
        if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#B8860B]/60 bg-[#0A0A0A]/80 text-[13px] text-[#E8C15A]">
          Suelta la imagen para adjuntarla
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl border border-white/[0.1] bg-[#141414] p-1.5">
          <p className="px-2 pb-1 text-[10.5px] uppercase tracking-[0.08em] text-[#555555]">Mencionar</p>
          {suggestions.map((c, i) => (
            <button
              key={c.uid}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(c)
              }}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#DDDDDD]"
              style={i === mentionIndex ? { background: 'rgba(255,255,255,0.06)' } : undefined}
            >
              <Avatar displayName={c.name} photoURL={c.photo} size={20} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {panel === 'format' && (
        <div className="flex items-center gap-1">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              title={f.title}
              onMouseDown={(e) => {
                e.preventDefault()
                applyFormat(f.wrap)
              }}
              className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/[0.08] px-2 text-[12px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
              style={{ fontWeight: f.id === 'bold' ? 700 : 400, fontStyle: f.id === 'italic' ? 'italic' : 'normal', textDecoration: f.id === 'strike' ? 'line-through' : 'none', fontFamily: f.id === 'code' ? 'monospace' : undefined }}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-[#555555]">Selecciona texto y aplica · Shift+Enter para nueva línea</span>
        </div>
      )}

      {panel === 'emoji' && (
        <div className="grid grid-cols-12 gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onMouseDown={(ev) => {
                ev.preventDefault()
                insertAtCursor(e)
              }}
              className="flex h-8 items-center justify-center rounded-md text-[17px] hover:bg-white/[0.08]"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {panel === 'attach' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="El documento oficial vive en Google Drive — compártelo como enlace"
            onClick={() => {
              setDriveMode(true)
              setPanel(null)
              inputRef.current?.focus()
            }}
            className="flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#CCCCCC] hover:border-white/[0.2] hover:text-[#F5F5F5]"
          >
            <FileIcon size={13} /> Documento de Drive
          </button>
          <button type="button" disabled title="Requiere activar Firebase Storage — todavía no está habilitado" className="flex cursor-not-allowed items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-[#CCCCCC] opacity-40">
            <PaperclipIcon size={13} /> Otro archivo (PDF, Excel…)
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 pr-3">
          <img src={pendingImage.thumbUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
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
          <p className="text-[11.5px] text-[#888888]">Pega el enlace del documento en Drive — el oficial se queda allá, aquí solo compartes el acceso.</p>
          <button type="button" onClick={() => setDriveMode(false)} className="flex-shrink-0 text-[11.5px] text-[#666666] hover:text-[#F5F5F5]">
            Cancelar
          </button>
        </div>
      )}

      {/* Tools wrap onto their own line under the text when the column is
          narrow (a side panel open, or the thread composer), instead of
          squeezing the text box down to a few characters. */}
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1 rounded-[22px] border border-white/[0.1] bg-white/[0.03] py-1.5 pr-1.5 pl-4">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => updateText(e.target.value, e.target.selectionStart)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (suggestions.length) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                return setMentionIndex((i) => (i + 1) % suggestions.length)
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                return setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                return insertMention(suggestions[mentionIndex])
              }
              if (e.key === 'Escape') return setMentionQuery(null)
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') reset()
          }}
          placeholder={driveMode ? 'https://docs.google.com/...' : placeholder || 'Escribe un mensaje...'}
          className={`max-h-[140px] min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-[13.5px] leading-relaxed text-[#F5F5F5] placeholder:text-[#666666] outline-none ${compact ? 'basis-full' : 'basis-[220px]'}`}
        />
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          <ToolButton title="Formato" active={panel === 'format'} onClick={() => togglePanel('format')}>
            <span className="text-[13px] font-medium">Aa</span>
          </ToolButton>
          <ToolButton title="Emoji" active={panel === 'emoji'} onClick={() => togglePanel('emoji')}>
            <SmileIcon size={17} />
          </ToolButton>
          <ToolButton title="Adjuntar documento" active={panel === 'attach' || driveMode} onClick={() => togglePanel('attach')}>
            <PaperclipIcon size={16} />
          </ToolButton>
          <ToolButton title={processing ? 'Procesando imagen…' : 'Imagen'} disabled={processing} onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} />
          </ToolButton>
          <ToolButton title="Nota de voz (máx. 1 min)" onClick={voice.start}>
            <MicIcon size={16} />
          </ToolButton>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() && !pendingImage}
            className="ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#F5F5F5] transition-opacity duration-150 disabled:opacity-40"
            style={{ background: '#B8860B' }}
            title="Enviar"
          >
            <ArrowRightIcon size={15} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
      </div>
    </div>
  )
}

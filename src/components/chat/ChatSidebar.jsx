import { useEffect, useState } from 'react'
import { dmIdFor } from '../../lib/firestore'
import { isPrivate, userLabel, groupLabel, presenceOf } from '../../lib/chat'
import { PlusIcon, SearchIcon, LockIcon, InboxIcon, AtIcon, BookmarkIcon, FolderIcon, EditIcon } from '../icons'
import { useChatDrafts } from '../../lib/chatDrafts'
import PersonAvatar from './PersonAvatar'

// Comunicación's left column: search, the Inbox/Hilos/Menciones/Guardados/
// Archivos views, DMs, groups and channels. Split out of ChatModule.jsx.

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#B8860B' }} />
}

function SectionHeader({ label, onAdd, addTitle }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#767676]">{label}</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          title={addTitle}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[#858585] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <PlusIcon size={12} />
        </button>
      )}
    </div>
  )
}

function SubLabel({ children }) {
  return <p className="mt-1.5 mb-0.5 px-2.5 text-[11px] font-medium text-[#767676]">{children}</p>
}

// A half-written message waiting in a conversation you're not looking at.
function DraftMark() {
  return (
    <span title="Tienes un borrador aquí" className="flex flex-shrink-0 items-center text-[#E8C15A]">
      <EditIcon size={11} />
    </span>
  )
}

function ConversationButton({ active, unread, draft, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors duration-150 hover:bg-white/[0.04]"
      style={{
        background: active ? 'rgba(184,134,11,0.14)' : undefined,
        color: active ? '#E8C15A' : unread ? '#F5F5F5' : '#CCCCCC',
        fontWeight: unread ? 600 : 500,
      }}
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      {(unread || (draft && !active)) && (
        <span className="flex flex-shrink-0 items-center gap-1.5">
          {draft && !active && <DraftMark />}
          {unread && <UnreadDot />}
        </span>
      )}
    </button>
  )
}

// Order mirrors how the team actually talks: people first (DMs), then
// ad-hoc groups, then the permanent channels — split into "Empresa"
// (everyone in ADOR) and "Privados" (invitation only), so it's obvious at
// a glance which rooms the whole firm can read.
function ThreadsNavIcon({ size = 15, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 5.5h16v10H11l-4 3.5v-3.5H4v-10Z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  )
}

const VIEWS = [
  { id: 'inbox', label: 'Inbox', short: 'Inbox', Icon: InboxIcon },
  { id: 'threads', label: 'Hilos', short: 'Hilos', Icon: ThreadsNavIcon },
  { id: 'mentions', label: 'Menciones', short: 'Menciones', Icon: AtIcon },
  { id: 'saved', label: 'Mensajes guardados', short: 'Guardados', Icon: BookmarkIcon },
  { id: 'files', label: 'Archivos', short: 'Archivos', Icon: FolderIcon },
]

// Inbox · Hilos · Menciones · Guardados · Archivos as one compact row of
// icons (with their counts) instead of five full-width rows — the sidebar
// was carrying too much at the same visual weight. The open view widens to
// show its name in gold, so it's clear where you are without a tooltip.
function ViewNav({ view, counts, onSelectView }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
      {VIEWS.map(({ id, label, short, Icon }) => {
        const active = view === id
        const count = counts[id]
        return (
          <button
            key={id}
            type="button"
            title={count ? `${label} · ${count} sin leer` : label}
            aria-label={label}
            onClick={() => onSelectView(id)}
            className={`relative flex h-9 items-center justify-center gap-1.5 rounded-lg transition-[flex,background-color] duration-200 hover:bg-white/[0.05] ${active ? 'flex-[2.6] px-2' : 'flex-1'}`}
            style={{ background: active ? 'rgba(184,134,11,0.16)' : undefined, color: active ? '#E8C15A' : count ? '#F5F5F5' : '#9A9A9A' }}
          >
            <Icon size={active ? 15 : 17} />
            {active && <span className="truncate text-[12.5px] font-medium">{short}</span>}
            {count > 0 && (
              <span
                className="absolute top-0.5 right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                style={{ background: id === 'mentions' ? '#E8C15A' : '#F2EBDD', color: '#1C1A16' }}
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function ChatSidebar({ channels, groups, users, presence, currentUid, selected, view, viewCounts, unreadMap, onSelect, onSelectView, onNewChannel, onNewGroup, onSetDnd, calendarConnected, onSearchMessages }) {
  const [search, setSearch] = useState('')
  const drafts = useChatDrafts()
  const q = search.trim().toLowerCase()
  const match = (label) => !q || label.toLowerCase().includes(q)

  const otherUsers = users.filter((u) => u.id !== currentUid && match(userLabel(u)))
  const visibleGroups = groups.filter((g) => match(groupLabel(g, users, currentUid)))
  const publicChannels = channels.filter((c) => !isPrivate(c) && match(c.name))
  const privateChannels = channels.filter((c) => isPrivate(c) && match(c.name))
  const searching = q.length > 0

  const isActive = (type, id) => !view && selected?.type === type && selected.id === id

  return (
    <div className="flex w-[230px] flex-shrink-0 flex-col gap-5 overflow-y-auto pb-4">
      <div>
        <MeHeader presence={presence[currentUid]} uid={currentUid} onSetDnd={onSetDnd} calendarConnected={calendarConnected} />
        <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5">
          <SearchIcon size={12} className="text-[#858585]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search.trim() && onSearchMessages(search.trim())}
            placeholder="Buscar…"
            className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#858585] outline-none"
          />
        </div>
        {searching && (
          <button
            type="button"
            onClick={() => onSearchMessages(search.trim())}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#E8C15A] hover:bg-white/[0.04]"
          >
            <SearchIcon size={12} />
            <span className="truncate">Buscar “{search.trim()}” en todos los mensajes</span>
            <span className="ml-auto text-[11px] text-[#858585]">Enter</span>
          </button>
        )}
      </div>

      <ViewNav view={view} counts={viewCounts} onSelectView={onSelectView} />

      <div>
        <SectionHeader label="Mensajes directos" />
        <div className="flex flex-col gap-0.5">
          {users.filter((u) => u.id !== currentUid).length === 0 && (
            <p className="px-2.5 py-1 text-[12.5px] leading-relaxed text-[#767676]">
              Aparecerán aquí en cuanto tus socios entren a ADOR OS por primera vez.
            </p>
          )}
          {otherUsers.map((u) => {
            const convId = dmIdFor(currentUid, u.id)
            const active = isActive('dm', u.id)
            return (
              <ConversationButton key={u.id} active={active} unread={!active && unreadMap[convId]} draft={Boolean(drafts[convId])} onClick={() => onSelect({ type: 'dm', id: u.id })}>
                <PersonAvatar uid={u.id} name={userLabel(u)} size={20} showPresence />
                <span className="truncate">{userLabel(u)}</span>
              </ConversationButton>
            )
          })}
        </div>
      </div>

      <div>
        <SectionHeader label="Grupos" onAdd={onNewGroup} addTitle="Nuevo grupo privado" />
        <div className="flex flex-col gap-0.5">
          {visibleGroups.map((g) => {
            const active = isActive('conv', g.id)
            return (
              <ConversationButton key={g.id} active={active} unread={!active && unreadMap[g.id]} draft={Boolean(drafts[g.id])} onClick={() => onSelect({ type: 'conv', id: g.id })}>
                <UsersBadge count={(g.memberUids || []).length} />
                <span className="truncate">{groupLabel(g, users, currentUid)}</span>
              </ConversationButton>
            )
          })}
          {groups.length === 0 && !searching && (
            <p className="px-2.5 py-1 text-[12.5px] leading-relaxed text-[#767676]">Conversaciones privadas entre algunas personas, sin ser un área fija.</p>
          )}
        </div>
      </div>

      <div>
        <SectionHeader label="Canales" onAdd={onNewChannel} addTitle="Nuevo canal" />
        <div className="flex flex-col gap-0.5">
          {channels.length === 0 && !searching && <p className="px-2.5 py-1 text-[12.5px] text-[#767676]">Sin canales todavía</p>}
          {publicChannels.length > 0 && <SubLabel>Empresa</SubLabel>}
          {publicChannels.map((c) => {
            const active = isActive('conv', c.id)
            return (
              <ConversationButton key={c.id} active={active} unread={!active && unreadMap[c.id]} draft={Boolean(drafts[c.id])} onClick={() => onSelect({ type: 'conv', id: c.id })}>
                <span className="w-3 text-center text-[#858585]">#</span>
                <span className="truncate">{c.name}</span>
              </ConversationButton>
            )
          })}
          {privateChannels.length > 0 && <SubLabel>Privados</SubLabel>}
          {privateChannels.map((c) => {
            const active = isActive('conv', c.id)
            return (
              <ConversationButton key={c.id} active={active} unread={!active && unreadMap[c.id]} draft={Boolean(drafts[c.id])} onClick={() => onSelect({ type: 'conv', id: c.id })}>
                <LockIcon size={11} className="w-3 flex-shrink-0 text-[#858585]" />
                <span className="truncate">{c.name}</span>
              </ConversationButton>
            )
          })}
        </div>
      </div>

      <CallNotificationsPrompt />
    </div>
  )
}

// Browsers only let a page ask for notification permission in response to
// a click, so this is an explicit one-time prompt rather than something
// that fires on load. Hidden once answered either way; if denied, only the
// browser's own site settings can undo it, so it says so once.
const PROMPT_KEY = 'ador_call_prompt_dismissed'

function wasDismissed() {
  try {
    return localStorage.getItem(PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

function CallNotificationsPrompt() {
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported')
  const [dismissed, setDismissed] = useState(wasDismissed)
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(PROMPT_KEY, '1')
    } catch {
      // private mode — it just shows again next time
    }
  }
  // "Blocked" is only worth saying once: after it's been shown, it's
  // remembered as seen and doesn't sit in the sidebar forever.
  useEffect(() => {
    if (permission !== 'denied' || dismissed) return
    try {
      localStorage.setItem(PROMPT_KEY, '1')
    } catch {
      // private mode — it shows again next time
    }
  }, [permission, dismissed])
  // Shown until answered or dismissed once — never a permanent fixture.
  if (dismissed || permission === 'granted' || permission === 'unsupported') return null
  if (permission === 'denied') {
    return (
      <p className="px-1 text-[11px] leading-relaxed text-[#8A8A8A]">
        Avisos del sistema bloqueados en este navegador — actívalos desde la configuración del sitio.{' '}
        <button type="button" onClick={dismiss} className="text-[#9A9A9A] underline hover:text-[#F5F5F5]">
          Ocultar
        </button>
      </p>
    )
  }
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed text-[#9A9A9A]">Recibe un aviso del sistema cuando te llamen o te escriban y ADOR OS esté en otra pestaña.</p>
      <div className="mt-1.5 flex items-center gap-3">
        <button type="button" onClick={() => Notification.requestPermission().then(setPermission)} className="text-[12.5px] font-medium text-[#E8C15A] hover:underline">
          Activar avisos
        </button>
        <button type="button" onClick={dismiss} className="text-[12.5px] text-[#8A8A8A] hover:text-[#F5F5F5]">
          Ahora no
        </button>
      </div>
    </div>
  )
}

function dndOptions(now = new Date()) {
  const tomorrow9 = new Date(now)
  tomorrow9.setDate(now.getDate() + 1)
  tomorrow9.setHours(9, 0, 0, 0)
  return [
    { label: '30 minutos', until: new Date(now.getTime() + 30 * 60000) },
    { label: '1 hora', until: new Date(now.getTime() + 60 * 60000) },
    { label: '2 horas', until: new Date(now.getTime() + 120 * 60000) },
    { label: 'Hasta mañana 9:00', until: tomorrow9 },
  ]
}

// The top of the sidebar: "Comunicación" with your own status under it, and
// your face on the right — click it to change your status (Slack's
// pattern). Disponible, or No molestar for a while: calls don't ring and
// messages don't pop up until it ends. "En reunión" isn't picked here — it
// comes on its own from your Google Calendar while an event is happening.
function MeHeader({ presence, uid, onSetDnd, calendarConnected }) {
  const [open, setOpen] = useState(false)
  const p = presenceOf(presence)
  const current = p.status === 'dnd' || p.status === 'meeting' ? p : { status: 'available', label: 'Disponible', color: '#4CAF50' }
  const pick = (until) => {
    onSetDnd(until)
    setOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#F5F5F5]">Comunicación</p>
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex max-w-full items-center gap-1.5 text-[11px] text-[#9A9A9A] hover:text-[#F5F5F5]">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: current.color }} />
            <span className="truncate">{current.label}</span>
            <span>{open ? '▴' : '▾'}</span>
          </button>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} title="Cambiar mi estado" className="flex-shrink-0 rounded-full">
          <PersonAvatar uid={uid} size={32} showPresence />
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5">
          <button type="button" onClick={() => pick(null)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#DDDDDD] hover:bg-white/[0.05]">
            <span className="h-2 w-2 rounded-full bg-[#4CAF50]" /> Disponible
          </button>
          <p className="px-2 pt-1 text-[11px] text-[#8A8A8A]">No molestar durante…</p>
          {dndOptions().map((o) => (
            <button key={o.label} type="button" onClick={() => pick(o.until)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#DDDDDD] hover:bg-white/[0.05]">
              <span className="h-2 w-2 rounded-full bg-[#EF5350]" /> {o.label}
            </button>
          ))}
          <p className="px-2 pt-1.5 pb-1 text-[11px] leading-relaxed text-[#8A8A8A]">
            {calendarConnected
              ? '“En reunión” se pone solo mientras tengas un evento en tu Google Calendar.'
              : 'Conecta Google (Calendario o Llamar) y “En reunión” se pondrá solo durante tus eventos.'}
          </p>
        </div>
      )}
    </div>
  )
}

function UsersBadge({ count }) {
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-semibold text-[#888888]">
      {count}
    </span>
  )
}

import { useState } from 'react'
import { dmIdFor } from '../../lib/firestore'
import { isPrivate, userLabel, groupLabel, presenceOf } from '../../lib/chat'
import Avatar from '../shell/Avatar'
import { PlusIcon, SearchIcon, LockIcon, InboxIcon, AtIcon, BookmarkIcon, FolderIcon } from '../icons'

// Comunicación's left column: search, the Inbox/Hilos/Menciones/Guardados/
// Archivos views, DMs, groups and channels. Split out of ChatModule.jsx.

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#B8860B' }} />
}

function SectionHeader({ label, onAdd, addTitle }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">{label}</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          title={addTitle}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[#666666] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
        >
          <PlusIcon size={12} />
        </button>
      )}
    </div>
  )
}

function SubLabel({ children }) {
  return <p className="mt-1.5 mb-0.5 px-2.5 text-[10.5px] font-medium text-[#3A3A3A]">{children}</p>
}

function ConversationButton({ active, unread, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-white/[0.04]"
      style={{
        background: active ? 'rgba(184,134,11,0.14)' : undefined,
        color: active ? '#E8C15A' : unread ? '#F5F5F5' : '#CCCCCC',
        fontWeight: unread ? 600 : 500,
      }}
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      {unread && <UnreadDot />}
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

// Online dot on an avatar: green = en línea, amber = ausente, none =
// desconectado (no grey dot — absence of a signal is the signal).
export function PresenceAvatar({ presence, size = 20, ...avatarProps }) {
  const p = presenceOf(presence)
  return (
    <span className="relative inline-flex flex-shrink-0" title={p.label}>
      <Avatar size={size} {...avatarProps} />
      {p.color && (
        <span
          className="absolute rounded-full ring-2 ring-[#0A0A0A]"
          style={{ background: p.color, width: Math.max(7, size * 0.3), height: Math.max(7, size * 0.3), right: -1, bottom: -1 }}
        />
      )}
    </span>
  )
}

const VIEWS = [
  { id: 'inbox', label: 'Inbox', Icon: InboxIcon },
  { id: 'threads', label: 'Hilos', Icon: ThreadsNavIcon },
  { id: 'mentions', label: 'Menciones', Icon: AtIcon },
  { id: 'saved', label: 'Mensajes guardados', Icon: BookmarkIcon },
  { id: 'files', label: 'Archivos', Icon: FolderIcon },
]

function ViewNav({ view, counts, onSelectView }) {
  return (
    <div className="flex flex-col gap-0.5">
      {VIEWS.map(({ id, label, Icon }) => {
        const active = view === id
        const count = counts[id]
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectView(id)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-white/[0.04]"
            style={{ background: active ? 'rgba(184,134,11,0.14)' : undefined, color: active ? '#E8C15A' : count ? '#F5F5F5' : '#CCCCCC', fontWeight: count ? 600 : 500 }}
          >
            <Icon size={15} className="flex-shrink-0 opacity-80" />
            <span className="flex-1 truncate">{label}</span>
            {count > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold" style={{ background: id === 'mentions' ? '#B8860B' : 'rgba(255,255,255,0.12)', color: '#F5F5F5' }}>
                {count}
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
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#666666]">Comunicación</p>
        <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5">
          <SearchIcon size={12} className="text-[#666666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search.trim() && onSearchMessages(search.trim())}
            placeholder="Buscar…"
            className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
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
            <span className="ml-auto text-[10.5px] text-[#666666]">Enter</span>
          </button>
        )}
      </div>

      <StatusPicker presence={presence[currentUid]} onSetDnd={onSetDnd} calendarConnected={calendarConnected} />

      <ViewNav view={view} counts={viewCounts} onSelectView={onSelectView} />

      <div>
        <SectionHeader label="Mensajes directos" />
        <div className="flex flex-col gap-0.5">
          {users.filter((u) => u.id !== currentUid).length === 0 && (
            <p className="px-2.5 py-1 text-[11.5px] leading-relaxed text-[#444444]">
              Aparecerán aquí en cuanto tus socios entren a ADOR OS por primera vez.
            </p>
          )}
          {otherUsers.map((u) => {
            const convId = dmIdFor(currentUid, u.id)
            const active = isActive('dm', u.id)
            return (
              <ConversationButton key={u.id} active={active} unread={!active && unreadMap[convId]} onClick={() => onSelect({ type: 'dm', id: u.id })}>
                <PresenceAvatar presence={presence[u.id]} displayName={userLabel(u)} photoURL={u.photoDataUrl} size={20} />
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
              <ConversationButton key={g.id} active={active} unread={!active && unreadMap[g.id]} onClick={() => onSelect({ type: 'conv', id: g.id })}>
                <UsersBadge count={(g.memberUids || []).length} />
                <span className="truncate">{groupLabel(g, users, currentUid)}</span>
              </ConversationButton>
            )
          })}
          {groups.length === 0 && !searching && (
            <p className="px-2.5 py-1 text-[11.5px] leading-relaxed text-[#444444]">Conversaciones privadas entre algunas personas, sin ser un área fija.</p>
          )}
        </div>
      </div>

      <div>
        <SectionHeader label="Canales" onAdd={onNewChannel} addTitle="Nuevo canal" />
        <div className="flex flex-col gap-0.5">
          {channels.length === 0 && !searching && <p className="px-2.5 py-1 text-[12px] text-[#444444]">Sin canales todavía</p>}
          {publicChannels.length > 0 && <SubLabel>Empresa</SubLabel>}
          {publicChannels.map((c) => {
            const active = isActive('conv', c.id)
            return (
              <ConversationButton key={c.id} active={active} unread={!active && unreadMap[c.id]} onClick={() => onSelect({ type: 'conv', id: c.id })}>
                <span className="w-3 text-center text-[#666666]">#</span>
                <span className="truncate">{c.name}</span>
              </ConversationButton>
            )
          })}
          {privateChannels.length > 0 && <SubLabel>Privados</SubLabel>}
          {privateChannels.map((c) => {
            const active = isActive('conv', c.id)
            return (
              <ConversationButton key={c.id} active={active} unread={!active && unreadMap[c.id]} onClick={() => onSelect({ type: 'conv', id: c.id })}>
                <LockIcon size={11} className="w-3 flex-shrink-0 text-[#666666]" />
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
function CallNotificationsPrompt() {
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported')
  if (permission === 'granted' || permission === 'unsupported') return null
  if (permission === 'denied') {
    return <p className="px-1 text-[11px] leading-relaxed text-[#555555]">Avisos de llamada bloqueados en este navegador — actívalos desde la configuración del sitio.</p>
  }
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] px-3 py-2.5">
      <p className="text-[11.5px] leading-relaxed text-[#888888]">Recibe un aviso del sistema cuando te llamen y ADOR OS esté en otra pestaña.</p>
      <button
        type="button"
        onClick={() => Notification.requestPermission().then(setPermission)}
        className="mt-1.5 text-[12px] font-medium text-[#E8C15A] hover:underline"
      >
        Activar avisos de llamada
      </button>
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

// "Mi estado": your own availability, which everyone sees on your dot.
// Disponible (default) or No molestar for a while — calls don't ring and
// messages don't pop up until it ends. "En reunión" isn't picked here: it
// comes on its own from your Google Calendar while an event is happening.
function StatusPicker({ presence, onSetDnd, calendarConnected }) {
  const [open, setOpen] = useState(false)
  const p = presenceOf(presence)
  const current = p.status === 'dnd' || p.status === 'meeting' ? p : { status: 'available', label: 'Disponible', color: '#4CAF50' }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: current.color }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] uppercase tracking-[0.08em] text-[#555555]">Mi estado</span>
          <span className="block truncate text-[12.5px] text-[#DDDDDD]">{current.label}</span>
        </span>
        <span className="text-[11px] text-[#666666]">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 border-t border-white/[0.06] p-1.5">
          <button
            type="button"
            onClick={() => {
              onSetDnd(null)
              setOpen(false)
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#CCCCCC] hover:bg-white/[0.05]"
          >
            <span className="h-2 w-2 rounded-full bg-[#4CAF50]" /> Disponible
          </button>
          <p className="px-2 pt-1 text-[10.5px] text-[#555555]">No molestar durante…</p>
          {dndOptions().map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                onSetDnd(o.until)
                setOpen(false)
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-[#CCCCCC] hover:bg-white/[0.05]"
            >
              <span className="h-2 w-2 rounded-full bg-[#EF5350]" /> {o.label}
            </button>
          ))}
          <p className="px-2 pt-1.5 pb-1 text-[10.5px] leading-relaxed text-[#555555]">
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

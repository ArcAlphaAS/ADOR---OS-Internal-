import { useState } from 'react'
import { dmIdFor } from '../../lib/firestore'
import { isPrivate, userLabel, groupLabel, presenceOf, shortTime } from '../../lib/chat'
import { PlusIcon, SearchIcon, LockIcon, InboxIcon, AtIcon, BookmarkIcon, FolderIcon, EditIcon, PinIcon } from '../icons'
import { useChatDrafts } from '../../lib/chatDrafts'
import PersonAvatar from './PersonAvatar'
import PushNotificationsCard from '../shell/PushNotificationsCard'

// Comunicación's left column: search, the Inbox/Hilos/Menciones/Guardados/
// Archivos views, DMs, groups and channels. Split out of ChatModule.jsx.

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#F4EEE2' }} />
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
    <span title="Tienes un borrador aquí" className="flex flex-shrink-0 items-center text-[#F4EEE2]">
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
        background: active ? 'rgba(244,238,226,0.1)' : undefined,
        color: active ? '#F4EEE2' : unread ? '#F5F5F5' : '#CCCCCC',
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

// DM / group row with the last message under the name and its time on the
// right (WhatsApp/Slack style), the unread count, a draft mark, and a pin
// that appears on hover. Pinned rows can be dragged to reorder.
function PreviewRow({ active, unreadCount, unread, draftText, preview, time, onClick, avatar, label, pinned, onTogglePin, dragProps }) {
  return (
    <div className="group/row relative" {...dragProps}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
        style={{ background: active ? 'rgba(244,238,226,0.1)' : undefined }}
      >
        <span className="flex-shrink-0">{avatar}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13.5px]" style={{ color: active ? '#F4EEE2' : unread ? '#F5F5F5' : '#D5D5D5', fontWeight: unread ? 600 : 500 }}>
              {label}
            </span>
            <span className="flex-shrink-0 text-[10.5px]" style={{ color: unread ? '#F4EEE2' : '#6E6E6E' }}>
              {time}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[12px]" style={{ color: draftText && !active ? '#F4EEE2' : unread ? '#BBBBBB' : '#7E7E7E' }}>
              {draftText && !active ? `Borrador: ${draftText}` : preview || 'Sin mensajes todavía'}
            </span>
            {unread && !active && (
              <span className="flex h-[16px] min-w-[16px] flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold" style={{ background: '#F4EEE2', color: '#1C1A16' }}>
                {unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : ''}
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        title={pinned ? 'Quitar de fijados' : 'Fijar arriba'}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#141414] text-[#888888] opacity-0 transition-opacity hover:text-[#F4EEE2] group-hover/row:opacity-100"
        style={pinned ? { color: '#F4EEE2' } : undefined}
      >
        <PinIcon size={10} />
      </button>
    </div>
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
            style={{ background: active ? 'rgba(244,238,226,0.1)' : undefined, color: active ? '#F4EEE2' : count ? '#F5F5F5' : '#9A9A9A' }}
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

export default function ChatSidebar({ channels, groups, users, presence, currentUid, selected, view, viewCounts, unreadMap, activity = {}, pinned = [], onSetPinned, onSelect, onSelectView, onNewChannel, onNewGroup, onSetDnd, calendarConnected, onSearchMessages }) {
  const [search, setSearch] = useState('')
  const drafts = useChatDrafts()
  const q = search.trim().toLowerCase()
  const match = (label) => !q || label.toLowerCase().includes(q)

  const [dragKey, setDragKey] = useState(null)
  const isPinned = (key) => pinned.includes(key)
  const togglePin = (key) => onSetPinned?.(isPinned(key) ? pinned.filter((k) => k !== key) : [...pinned, key].slice(-8))
  const movePinned = (from, to) => {
    if (!from || from === to) return
    const next = pinned.filter((k) => k !== from)
    next.splice(Math.max(0, next.indexOf(to)), 0, from)
    onSetPinned?.(next)
  }
  const dragProps = (key) =>
    isPinned(key)
      ? { draggable: true, onDragStart: () => setDragKey(key), onDragOver: (e) => dragKey && e.preventDefault(), onDrop: () => { movePinned(dragKey, key); setDragKey(null) }, onDragEnd: () => setDragKey(null) }
      : {}

  // Most recent conversation first; people you haven't written to follow alphabetically.
  const ms = (k) => activity[k]?.lastAt?.toMillis?.() || 0
  const dmKey = (u) => dmIdFor(currentUid, u.id)
  const allOthers = users.filter((u) => u.id !== currentUid)
  const otherUsers = allOthers.filter((u) => match(userLabel(u)) && !isPinned(dmKey(u))).sort((a, b) => ms(dmKey(b)) - ms(dmKey(a)) || userLabel(a).localeCompare(userLabel(b), 'es'))
  const visibleGroups = groups.filter((g) => match(groupLabel(g, users, currentUid)) && !isPinned(g.id)).sort((a, b) => ms(b.id) - ms(a.id))
  const publicChannels = channels.filter((c) => !isPrivate(c) && match(c.name) && !isPinned(c.id))
  const privateChannels = channels.filter((c) => isPrivate(c) && match(c.name) && !isPinned(c.id))
  const searching = q.length > 0

  // Pinned conversations of any kind, in the order the person chose.
  const dmByKey = Object.fromEntries(allOthers.map((u) => [dmKey(u), u]))
  const convByKey = Object.fromEntries([...groups, ...channels].map((c) => [c.id, c]))
  const pinnedItems = pinned
    .map((key) => (dmByKey[key] ? { type: 'dm', key, user: dmByKey[key] } : convByKey[key] ? { type: groups.some((g) => g.id === key) ? 'group' : 'channel', key, conv: convByKey[key] } : null))
    .filter((it) => it && match(it.type === 'dm' ? userLabel(it.user) : it.type === 'group' ? groupLabel(it.conv, users, currentUid) : it.conv.name))

  const previewFor = (key, isDm) => {
    const lm = activity[key]?.lastMessage
    if (!lm?.text) return ''
    const who = lm.authorUid === currentUid ? 'Tú: ' : isDm ? '' : `${(lm.authorName || '').split(' ')[0]}: `
    return who + lm.text
  }
  const dmRow = (u) => {
    const key = dmKey(u)
    const active = isActive('dm', u.id)
    return (
      <PreviewRow
        key={`dm-${key}`}
        active={active}
        unread={!active && unreadMap[key]}
        unreadCount={activity[key]?.unreadCount || 0}
        draftText={drafts[key]}
        preview={previewFor(key, true)}
        time={shortTime(activity[key]?.lastAt)}
        onClick={() => onSelect({ type: 'dm', id: u.id })}
        avatar={<PersonAvatar uid={u.id} name={userLabel(u)} size={32} showPresence />}
        label={userLabel(u)}
        pinned={isPinned(key)}
        onTogglePin={() => togglePin(key)}
        dragProps={dragProps(key)}
      />
    )
  }
  const groupRow = (g) => {
    const active = isActive('conv', g.id)
    return (
      <PreviewRow
        key={`g-${g.id}`}
        active={active}
        unread={!active && unreadMap[g.id]}
        unreadCount={activity[g.id]?.unreadCount || 0}
        draftText={drafts[g.id]}
        preview={previewFor(g.id, false)}
        time={shortTime(activity[g.id]?.lastAt)}
        onClick={() => onSelect({ type: 'conv', id: g.id })}
        avatar={<UsersBadge count={(g.memberUids || []).length} large />}
        label={groupLabel(g, users, currentUid)}
        pinned={isPinned(g.id)}
        onTogglePin={() => togglePin(g.id)}
        dragProps={dragProps(g.id)}
      />
    )
  }
  const channelRow = (c, locked) => {
    const active = isActive('conv', c.id)
    return (
      <div key={`c-${c.id}`} className="group/row relative" {...dragProps(c.id)}>
        <ConversationButton active={active} unread={!active && unreadMap[c.id]} draft={Boolean(drafts[c.id])} onClick={() => onSelect({ type: 'conv', id: c.id })}>
          {locked ? <LockIcon size={11} className="w-3 flex-shrink-0 text-[#858585]" /> : <span className="w-3 text-center text-[#858585]">#</span>}
          <span className="truncate">{c.name}</span>
        </ConversationButton>
        <button type="button" onClick={() => togglePin(c.id)} title={isPinned(c.id) ? 'Quitar de fijados' : 'Fijar arriba'} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#141414] text-[#888888] opacity-0 transition-opacity hover:text-[#F4EEE2] group-hover/row:opacity-100" style={isPinned(c.id) ? { color: '#F4EEE2' } : undefined}>
          <PinIcon size={10} />
        </button>
      </div>
    )
  }

  const isActive = (type, id) => !view && selected?.type === type && selected.id === id

  return (
    <div className="flex w-full flex-shrink-0 flex-col gap-5 overflow-y-auto pb-4 md:w-[230px]">
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
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#F4EEE2] hover:bg-white/[0.04]"
          >
            <SearchIcon size={12} />
            <span className="truncate">Buscar “{search.trim()}” en todos los mensajes</span>
            <span className="ml-auto text-[11px] text-[#858585]">Enter</span>
          </button>
        )}
      </div>

      <ViewNav view={view} counts={viewCounts} onSelectView={onSelectView} />

      {pinnedItems.length > 0 && (
        <div>
          <SectionHeader label="Fijados" />
          <div className="flex flex-col gap-0.5">
            {pinnedItems.map((it) => (it.type === 'dm' ? dmRow(it.user) : it.type === 'group' ? groupRow(it.conv) : channelRow(it.conv, isPrivate(it.conv))))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="Mensajes directos" />
        <div className="flex flex-col gap-0.5">
          {allOthers.length === 0 && (
            <p className="px-2.5 py-1 text-[12.5px] leading-relaxed text-[#767676]">
              Aparecerán aquí en cuanto tus socios entren a ADOR OS por primera vez.
            </p>
          )}
          {otherUsers.map(dmRow)}
        </div>
      </div>

      <div>
        <SectionHeader label="Grupos" onAdd={onNewGroup} addTitle="Nuevo grupo privado" />
        <div className="flex flex-col gap-0.5">
          {visibleGroups.map(groupRow)}
          {groups.length === 0 && !searching && (
            <button type="button" onClick={onNewGroup} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#858585] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F5]">
              <PlusIcon size={12} /> Nuevo grupo
            </button>
          )}
        </div>
      </div>

      <div>
        <SectionHeader label="Canales" onAdd={onNewChannel} addTitle="Nuevo canal" />
        <div className="flex flex-col gap-0.5">
          {channels.length === 0 && !searching && <p className="px-2.5 py-1 text-[12.5px] text-[#767676]">Sin canales todavía</p>}
          {publicChannels.length > 0 && <SubLabel>Empresa</SubLabel>}
          {publicChannels.map((c) => channelRow(c, false))}
          {privateChannels.length > 0 && <SubLabel>Privados</SubLabel>}
          {privateChannels.map((c) => channelRow(c, true))}
        </div>
      </div>

      <PushNotificationsCard variant="prompt" user={{ uid: currentUid }} />
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

function UsersBadge({ count, large = false }) {
  return (
    <span className={`flex flex-shrink-0 items-center justify-center bg-white/[0.06] font-semibold text-[#888888] ${large ? 'h-8 w-8 rounded-full text-[12px]' : 'h-5 w-5 rounded-md text-[10px]'}`}>
      {count}
    </span>
  )
}

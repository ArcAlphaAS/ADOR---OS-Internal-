import { useRef, useState } from 'react'
import { dmIdFor } from '../../lib/firestore'
import { isPrivate, userLabel, groupLabel, presenceOf, shortTime } from '../../lib/chat'
import { PlusIcon, SearchIcon, LockIcon, InboxIcon, AtIcon, BookmarkIcon, FolderIcon, EditIcon, PinIcon } from '../icons'
import { useChatDrafts } from '../../lib/chatDrafts'
import PersonAvatar from './PersonAvatar'
import PreviewText from './PreviewText'
import usePhone from '../../hooks/usePhone'
import SwipeRow from '../common/SwipeRow'
import { isTouchLayout } from '../../lib/motion'
import { motion } from 'framer-motion'
import PushNotificationsCard from '../shell/PushNotificationsCard'
import ContextMenu from '../common/ContextMenu'
import { useContextMenu } from '../../hooks/useContextMenu'

// Comunicación's left column: search, the Inbox/Hilos/Menciones/Guardados/
// Archivos views, DMs, groups and channels. Split out of ChatModule.jsx.

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#F4EEE2' }} />
}

function Chevron({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 180ms ease' }} aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

// Encabezado de sección. En escritorio se pliega (y recuerda cómo lo dejaste), muestra
// cuántas hay y, si está plegado, un aviso de lo que tiene sin leer: con muchas personas
// y canales, cada quien deja abierto solo lo que usa.
function SectionHeader({ label, onAdd, addTitle, count, open = true, onToggle, unread = 0 }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1">
      {onToggle ? (
        <button type="button" onClick={onToggle} aria-expanded={open} className="group/hd flex min-w-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A8A] hover:text-[#F5F5F5]">
          <Chevron open={open} />
          <span className="truncate">{label}</span>
          {count > 0 && <span className="normal-case tracking-normal tabular-nums text-[#6F6F6F]">{count}</span>}
          {!open && unread > 0 && <span className="ml-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[10px] font-semibold normal-case tracking-normal" style={{ background: '#F2EBDD', color: '#1C1A16' }}>{unread > 9 ? '9+' : unread}</span>}
        </button>
      ) : (
        <p className="text-[13px] font-medium text-[#8E8E93] md:text-[11px] md:uppercase md:tracking-[0.08em] md:text-[#8A8A8A]">{label}</p>
      )}
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

function MoreButton({ n, onClick, open }) {
  return (
    <button type="button" onClick={onClick} className="mt-0.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[#8A8A8A] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F5]">
      {open ? 'Ver menos' : `Ver ${n} más`}
    </button>
  )
}

const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'unread', label: 'Sin leer' },
  { id: 'mentions', label: 'Menciones' },
]

function SubLabel({ children }) {
  return <p className="mt-1.5 mb-0.5 px-2.5 text-[11px] font-medium text-[#8A8A8A]">{children}</p>
}

// A half-written message waiting in a conversation you're not looking at.
function DraftMark() {
  return (
    <span title="Tienes un borrador aquí" className="flex flex-shrink-0 items-center text-[#F4EEE2]">
      <EditIcon size={11} />
    </span>
  )
}

function MutedMark() {
  return (
    <span title="Silenciada" className="flex flex-shrink-0 items-center text-[#6F6F6F]">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 8a6 6 0 0 0-9.3-5M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M10.3 21a2 2 0 0 0 3.4 0M2 2l20 20" /></svg>
    </span>
  )
}

function ChannelTile({ locked, active }) {
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold" style={{ background: active ? 'rgba(244,238,226,0.16)' : 'rgba(255,255,255,0.06)', color: active ? '#F4EEE2' : '#9A9A9A' }}>
      {locked ? <LockIcon size={12} /> : '#'}
    </span>
  )
}

function ConversationButton({ active, unread, draft, count, muted, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[16px] transition-colors duration-150 hover:bg-white/[0.04] md:text-[13.5px]"
      style={{
        background: active ? 'rgba(244,238,226,0.1)' : undefined,
        color: active ? '#F4EEE2' : unread ? '#F5F5F5' : '#CCCCCC',
        fontWeight: unread ? 600 : 500,
      }}
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      {(unread || muted || (draft && !active)) && (
        <span className="flex flex-shrink-0 items-center gap-1.5">
          {draft && !active && <DraftMark />}
          {muted && !unread && <MutedMark />}
          {unread && (count > 0 ? <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold" style={{ background: '#F4EEE2', color: '#1C1A16' }}>{count > 9 ? '9+' : count}</span> : <UnreadDot />)}
        </span>
      )}
    </button>
  )
}

// DM / group row with the last message under the name and its time on the
// right (WhatsApp/Slack style), the unread count, a draft mark, and a pin
// that appears on hover. Pinned rows can be dragged to reorder.
function PreviewRow({ ctx, big, active, unreadCount, unread, draftText, preview, time, onClick, avatar, label, pinned, onTogglePin, onToggleMute, muted, dragProps }) {
  const touch = big && isTouchLayout()
  const row = (
    <div className="group/row relative" {...dragProps} {...(ctx ? { onContextMenu: ctx.onContextMenu } : {})}>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center text-left transition-colors duration-150 hover:bg-white/[0.04] ${big ? 'rounded-xl gap-4 px-1 py-2.5' : 'rounded-xl gap-2.5 px-2 py-1.5'}`}
        style={{ background: active ? 'rgba(244,238,226,0.1)' : undefined }}
      >
        <span className="flex-shrink-0">{avatar}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className={`truncate ${big ? 'text-[17px]' : 'text-[13.5px]'}`} style={{ color: active ? '#F4EEE2' : unread ? '#F5F5F5' : '#D5D5D5', fontWeight: unread ? 600 : 500 }}>
              {label}
            </span>
            <span className={`flex flex-shrink-0 items-center gap-1 ${big ? 'text-[13px]' : 'text-[10.5px]'}`} style={{ color: unread ? '#F4EEE2' : '#8E8E93' }}>
              {muted && !big && <MutedMark />}
              {time}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate ${big ? 'text-[14.5px]' : 'text-[12px]'}`} style={{ color: draftText && !active ? '#F4EEE2' : unread ? '#C7C7CC' : '#8E8E93' }}>
              {draftText && !active ? `Borrador: ${draftText}` : preview ? <PreviewText text={preview} /> : 'Sin mensajes todavía'}
            </span>
            {unread && !active && (
              <span className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${big ? 'h-[22px] min-w-[22px] px-1.5 text-[12px]' : 'h-[16px] min-w-[16px] px-1 text-[10px]'}`} style={{ background: '#F4EEE2', color: '#1C1A16' }}>
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
  if (!touch) return <div className="relative overflow-hidden rounded-xl">{row}</div>
  // Teléfono: a la derecha fija la conversación; a la izquierda salen Silenciar y Fijar.
  return (
    <SwipeRow
      background="#000"
      rightAction={onTogglePin ? { label: pinned ? 'Quitar de fijados' : 'Fijar arriba', color: '#FFC107', onClick: onTogglePin } : null}
      actions={[
        ...(onToggleMute ? [{ label: muted ? 'Activar' : 'Silenciar', color: '#636366', onClick: onToggleMute }] : []),
        ...(onTogglePin ? [{ label: pinned ? 'Soltar' : 'Fijar', color: '#FFC107', onClick: onTogglePin }] : []),
      ]}
    >
      {row}
    </SwipeRow>
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
  const phone = usePhone()
  return (
    <div className={phone ? 'flex items-center justify-between rounded-[18px] bg-[#1C1C1E] p-1' : 'flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-1'}>
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
            className={`relative flex ${phone ? 'h-11 rounded-[14px]' : 'h-9 rounded-lg'} items-center justify-center gap-1.5 transition-[flex,background-color] duration-200 hover:bg-white/[0.05] ${active ? 'flex-[2.6] px-2' : 'flex-1'}`}
            style={{ background: active ? 'rgba(244,238,226,0.1)' : undefined, color: active ? '#F4EEE2' : count ? '#F5F5F5' : '#9A9A9A' }}
          >
            <Icon size={phone ? 20 : active ? 15 : 17} />
            {active && <span className={`truncate font-medium ${phone ? 'text-[14px]' : 'text-[12.5px]'}`}>{short}</span>}
            {count > 0 && (
              <span
                className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
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

export default function ChatSidebar({ channels, groups, users, presence, currentUid, selected, view, viewCounts, unreadMap, activity = {}, pinned = [], onSetPinned, onSelect, onSelectView, onNewChannel, onNewGroup, onSetDnd, calendarConnected, onSearchMessages, mutedMap = {}, onToggleMute }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | unread
  const [expanded, setExpanded] = useState({})
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ador_chat_sections') || '{}') } catch { return {} }
  })
  const searchRef = useRef(null)
  const phone = usePhone()
  const toggleSection = (k) => setCollapsed((c) => {
    const n = { ...c, [k]: !c[k] }
    try { localStorage.setItem('ador_chat_sections', JSON.stringify(n)) } catch { /* sin almacenamiento */ }
    return n
  })
  const drafts = useChatDrafts()
  const { menu, bind, close } = useContextMenu()
  // Clic derecho en una conversación: abrir, fijar, y lo que corresponda.
  const ctxFor = (payload) => ({ onContextMenu: bind(payload).onContextMenu })
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
        ctx={ctxFor({ label: userLabel(u), subtitle: 'Mensaje directo', key, open: () => onSelect({ type: 'dm', id: u.id }) })}
        big={phone}
        avatar={<PersonAvatar uid={u.id} name={userLabel(u)} size={phone ? 54 : 36} showPresence />}
        label={userLabel(u)}
        pinned={isPinned(key)}
        onTogglePin={() => togglePin(key)}
        muted={Boolean(mutedMap[key])}
        onToggleMute={onToggleMute ? () => onToggleMute(key, !mutedMap[key]) : null}
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
        ctx={ctxFor({ label: groupLabel(g, users, currentUid), subtitle: 'Grupo', key: g.id, open: () => onSelect({ type: 'conv', id: g.id }) })}
        big={phone}
        avatar={<UsersBadge count={(g.memberUids || []).length} large size={phone ? 54 : 36} />}
        label={groupLabel(g, users, currentUid)}
        pinned={isPinned(g.id)}
        onTogglePin={() => togglePin(g.id)}
        muted={Boolean(mutedMap[g.id])}
        onToggleMute={onToggleMute ? () => onToggleMute(g.id, !mutedMap[g.id]) : null}
        dragProps={dragProps(g.id)}
      />
    )
  }
  const channelRow = (c, locked) => {
    const active = isActive('conv', c.id)
    return (
      <div key={`c-${c.id}`} className="group/row relative" {...dragProps(c.id)} onContextMenu={ctxFor({ label: `#${c.name}`, subtitle: locked ? 'Canal privado' : 'Canal', key: c.id, open: () => onSelect({ type: 'conv', id: c.id }) }).onContextMenu}>
        <ConversationButton active={active} unread={!active && unreadMap[c.id]} count={activity[c.id]?.unreadCount || 0} muted={Boolean(mutedMap[c.id])} draft={Boolean(drafts[c.id])} onClick={() => onSelect({ type: 'conv', id: c.id })}>
          <ChannelTile locked={locked} active={active} />
          <span className="truncate">{c.name}</span>
        </ConversationButton>
        <button type="button" onClick={() => togglePin(c.id)} title={isPinned(c.id) ? 'Quitar de fijados' : 'Fijar arriba'} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#141414] text-[#888888] opacity-0 transition-opacity hover:text-[#F4EEE2] group-hover/row:opacity-100" style={isPinned(c.id) ? { color: '#F4EEE2' } : undefined}>
          <PinIcon size={10} />
        </button>
      </div>
    )
  }

  const listCls = 'flex flex-col gap-0.5'
  const isActive = (type, id) => !view && selected?.type === type && selected.id === id

  // Pensado para crecer: con un equipo grande no se listan todas las personas, solo con
  // quien hay conversación (con 8 o menos se ven todas); cada sección muestra lo más reciente
  // y "Ver N más"; lo que tiene algo sin leer o está abierto nunca queda escondido.
  const unreadOnly = filter === 'unread'
  const showAll = searching || unreadOnly
  const smallTeam = allOthers.length <= 8
  const byActivity = (keyOf) => (a, b) => ms(keyOf(b)) - ms(keyOf(a))
  const dmList = allOthers
    .filter((u) => (smallTeam || searching || ms(dmKey(u)) > 0 || unreadMap[dmKey(u)]) && match(userLabel(u)) && !isPinned(dmKey(u)) && (!unreadOnly || unreadMap[dmKey(u)]))
    .sort((a, b) => ms(dmKey(b)) - ms(dmKey(a)) || userLabel(a).localeCompare(userLabel(b), 'es'))
  const groupList = groups.filter((g) => match(groupLabel(g, users, currentUid)) && !isPinned(g.id) && (!unreadOnly || unreadMap[g.id])).sort(byActivity((g) => g.id))
  const chanSort = (a, b) => ms(b.id) - ms(a.id) || a.name.localeCompare(b.name, 'es')
  const pubList = channels.filter((c) => !isPrivate(c) && match(c.name) && !isPinned(c.id) && (!unreadOnly || unreadMap[c.id])).sort(chanSort)
  const privList = channels.filter((c) => isPrivate(c) && match(c.name) && !isPinned(c.id) && (!unreadOnly || unreadMap[c.id])).sort(chanSort)
  const cut = (list, key, limit, keep) => (showAll || expanded[key] || list.length <= limit ? list : list.filter((x, i) => i < limit || keep(x)))
  const dmShown = cut(dmList, 'dm', 8, (u) => unreadMap[dmKey(u)] || isActive('dm', u.id))
  const groupShown = cut(groupList, 'group', 6, (g) => unreadMap[g.id] || isActive('conv', g.id))
  const pubShown = cut(pubList, 'pub', 8, (c) => unreadMap[c.id] || isActive('conv', c.id))
  const privShown = cut(privList, 'priv', 8, (c) => unreadMap[c.id] || isActive('conv', c.id))
  const toggleMore = (k) => setExpanded((e) => ({ ...e, [k]: !e[k] }))
  const unreadIn = (list, keyOf) => list.filter((x) => unreadMap[keyOf(x)]).length
  const totalUnread = Object.values(unreadMap).filter(Boolean).length
  const sec = (k) => (phone ? {} : { open: !collapsed[k], onToggle: () => toggleSection(k) })
  const isOpen = (k) => phone || !collapsed[k]

  return (
    <div className="flex w-full flex-shrink-0 flex-col gap-5 overflow-y-auto overflow-x-hidden pb-4 max-md:pb-[calc(112px+var(--sab))] [overscroll-behavior-x:none] md:w-[230px]">
      <div>
        <MeHeader presence={presence[currentUid]} uid={currentUid} onSetDnd={onSetDnd} calendarConnected={calendarConnected} />
        <div className={phone ? 'mt-3 flex items-center gap-2.5 rounded-full bg-[#1C1C1E] px-4' : 'mt-3 flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5'} style={phone ? { height: 44 } : undefined}>
          <SearchIcon size={phone ? 16 : 12} className={phone ? 'text-[#8E8E93]' : 'text-[#858585]'} />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search.trim() && onSearchMessages(search.trim())}
            placeholder="Buscar…"
            enterKeyHint="search"
            className={`w-full bg-transparent text-[#F5F5F5] outline-none ${phone ? 'text-[16px] placeholder:text-[#8E8E93]' : 'text-[12.5px] placeholder:text-[#858585]'}`}
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

      {phone && !searching && (
        <div className="-mx-4 flex-shrink-0 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <div className="flex gap-4">
            <button type="button" onClick={onNewGroup} className="flex w-[60px] flex-shrink-0 flex-col items-center gap-1.5">
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-dashed border-white/[0.3] text-[#F4EEE2]"><PlusIcon size={20} /></span>
              <span className="w-full truncate text-center text-[12px] text-[#9A9A9A]">Nuevo</span>
            </button>
            {[...allOthers].sort((a, b) => ms(dmKey(b)) - ms(dmKey(a)) || userLabel(a).localeCompare(userLabel(b), 'es')).map((u) => (
              <button key={u.id} type="button" onClick={() => onSelect({ type: 'dm', id: u.id })} className="flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5">
                <span className="rounded-full p-[3px]" style={{ boxShadow: unreadMap[dmKey(u)] ? '0 0 0 2.5px #F4EEE2, 0 0 14px rgba(244,238,226,0.25)' : '0 0 0 2px transparent' }}><PersonAvatar uid={u.id} name={userLabel(u)} size={58} showPresence /></span>
                <span className="w-full truncate text-center text-[12px] text-[#D5D5D5]">{userLabel(u).split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(
        <div className={phone ? 'flex items-center gap-1.5' : 'flex items-center gap-0.5'} role="tablist" aria-label="Filtrar conversaciones">
          {FILTERS.map((f) => {
            const active = f.id === 'mentions' ? view === 'mentions' : !view && filter === f.id
            const n = f.id === 'unread' ? totalUnread : f.id === 'mentions' ? viewCounts.mentions || 0 : 0
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (f.id === 'mentions') return onSelectView('mentions')
                  setFilter(f.id)
                  if (view) onSelectView(null)
                }}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full font-medium transition-colors duration-150 ${phone ? 'px-3.5 py-2 text-[14px]' : 'px-2 py-1 text-[12px]'} ${active ? 'bg-white/[0.12] text-[#F5F5F5]' : 'text-[#8A8A8A] hover:text-[#F5F5F5]'}`}
              >
                {f.label}
                {n > 0 && <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[10px] font-semibold" style={{ background: f.id === 'mentions' ? '#E8C15A' : '#F2EBDD', color: '#1C1A16' }}>{n > 9 ? '9+' : n}</span>}
              </button>
            )
          })}
        </div>
      )}

      <ViewNav view={view} counts={viewCounts} onSelectView={onSelectView} />

      {pinnedItems.length > 0 && (
        <div>
          <SectionHeader label="Fijados" />
          <div className={listCls}>
            {pinnedItems.map((it) => (it.type === 'dm' ? dmRow(it.user) : it.type === 'group' ? groupRow(it.conv) : channelRow(it.conv, isPrivate(it.conv))))}
          </div>
        </div>
      )}

      {(!unreadOnly || dmShown.length > 0) && (
        <div>
          <SectionHeader label="Mensajes directos" count={dmList.length} unread={unreadIn(dmList, dmKey)} onAdd={phone ? undefined : () => searchRef.current?.focus()} addTitle="Escribir a alguien: busca su nombre" {...sec('dm')} />
          {isOpen('dm') && (
            <div className={listCls}>
              {allOthers.length === 0 && (
                <p className="px-2.5 py-1 text-[12.5px] leading-relaxed text-[#8A8A8A]">Aparecerán aquí en cuanto tus socios entren a ADOR OS por primera vez.</p>
              )}
              {dmShown.map(dmRow)}
              {!showAll && dmList.length > 8 && <MoreButton open={expanded.dm} n={dmList.length - dmShown.length} onClick={() => toggleMore('dm')} />}
              {!smallTeam && !searching && !unreadOnly && dmList.length === 0 && <p className="px-2.5 py-1 text-[12.5px] text-[#8A8A8A]">Busca un nombre para escribirle a alguien.</p>}
            </div>
          )}
        </div>
      )}

      {(!unreadOnly || groupShown.length > 0) && (
        <div>
          <SectionHeader label="Grupos" count={groupList.length} unread={unreadIn(groupList, (g) => g.id)} onAdd={onNewGroup} addTitle="Nuevo grupo privado" {...sec('group')} />
          {isOpen('group') && (
            <div className={listCls}>
              {groupShown.map(groupRow)}
              {!showAll && groupList.length > 6 && <MoreButton open={expanded.group} n={groupList.length - groupShown.length} onClick={() => toggleMore('group')} />}
              {groups.length === 0 && !searching && (
                <button type="button" onClick={onNewGroup} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#858585] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F5]">
                  <PlusIcon size={12} /> Nuevo grupo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {(!unreadOnly || pubShown.length + privShown.length > 0) && (
        <div>
          <SectionHeader label="Canales" count={pubList.length + privList.length} unread={unreadIn(pubList, (c) => c.id) + unreadIn(privList, (c) => c.id)} onAdd={onNewChannel} addTitle="Nuevo canal" {...sec('channels')} />
          {isOpen('channels') && (
            <div className="flex flex-col gap-0.5">
              {channels.length === 0 && !searching && (
                <button type="button" onClick={onNewChannel} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-[#858585] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F5]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-[13px] font-semibold">#</span> Crear el primer canal
                </button>
              )}
              {pubShown.length > 0 && <SubLabel>Empresa</SubLabel>}
              {pubShown.map((c) => channelRow(c, false))}
              {!showAll && pubList.length > 8 && <MoreButton open={expanded.pub} n={pubList.length - pubShown.length} onClick={() => toggleMore('pub')} />}
              {privShown.length > 0 && <SubLabel>Privados</SubLabel>}
              {privShown.map((c) => channelRow(c, true))}
              {!showAll && privList.length > 8 && <MoreButton open={expanded.priv} n={privList.length - privShown.length} onClick={() => toggleMore('priv')} />}
            </div>
          )}
        </div>
      )}

      {unreadOnly && dmShown.length + groupShown.length + pubShown.length + privShown.length === 0 && pinnedItems.length === 0 && (
        <p className="px-2.5 py-2 text-center text-[12.5px] text-[#8A8A8A]">Estás al día. No hay nada sin leer.</p>
      )}

      <PushNotificationsCard variant="prompt" user={{ uid: currentUid }} />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.payload.label}
          subtitle={menu.payload.subtitle}
          onClose={close}
          items={[
            { label: 'Abrir', onClick: menu.payload.open },
            { label: isPinned(menu.payload.key) ? 'Quitar de fijados' : 'Fijar arriba', onClick: () => togglePin(menu.payload.key) },
            ...(onToggleMute ? [{ label: mutedMap[menu.payload.key] ? 'Activar avisos' : 'Silenciar', onClick: () => onToggleMute(menu.payload.key, !mutedMap[menu.payload.key]) }] : []),
          ]}
        />
      )}
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
          <p className="text-[42px] font-bold leading-[1.06] tracking-[-0.03em] text-[#F5F5F5] md:text-[15px] md:font-semibold md:leading-normal md:tracking-normal">Comunicación</p>
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex max-w-full items-center gap-1.5 text-[11px] text-[#9A9A9A] hover:text-[#F5F5F5]">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: current.color }} />
            <span className="truncate">{current.label}</span>
            <span>{open ? '▴' : '▾'}</span>
          </button>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} title="Cambiar mi estado" className="hidden flex-shrink-0 rounded-full md:block">
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

function UsersBadge({ count, large = false, size = 32 }) {
  return (
    <span className={`flex flex-shrink-0 items-center justify-center bg-white/[0.06] font-semibold text-[#888888] ${large ? 'rounded-full text-[14px]' : 'h-5 w-5 rounded-md text-[10px]'}`} style={large ? { width: size, height: size } : undefined}>
      {count}
    </span>
  )
}

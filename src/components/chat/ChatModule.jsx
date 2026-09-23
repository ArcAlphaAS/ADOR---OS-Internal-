import { useEffect, useRef, useState } from 'react'
import {
  subscribeChatChannels,
  createChatChannel,
  updateChatChannel,
  addChannelMembers,
  removeChannelMember,
  convertGroupToChannel,
  sendChannelMessage,
  updateChannelMessage,
  deleteChannelMessage,
  subscribeUsers,
  dmIdFor,
  subscribeMyDms,
  sendDmMessage,
  updateDmMessage,
  deleteDmMessage,
  markChatRead,
  subscribeUserProfile,
  subscribeDirectoryPeople,
  setChatMuted,
  createChatCall,
  subscribeMessages,
  toggleMessageReaction,
  createMentions,
  subscribeMyMentions,
  toggleSavedMessage,
  subscribeMySaved,
  indexChatFile,
  subscribeChatFiles,
  createChatBlob,
  cleanupMessageIndexes,
} from '../../lib/firestore'
import { conversationKind, isPrivate, isMember, membersOf, userLabel, groupLabel, findDriveLink, driveDocType } from '../../lib/chat'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { MessageIcon, PlusIcon, SearchIcon, LockIcon, InfoIcon, PhoneIcon, VideoIcon, InboxIcon, AtIcon, BookmarkIcon, FolderIcon } from '../icons'
import { MessageThread, Composer, ImageLightbox } from './ChatThread'
import { InboxView, MentionsView, SavedView, FilesView } from './ChatViews'
import NewConversationModal from './NewConversationModal'
import ConversationInfoPanel from './ConversationInfoPanel'
import MeetPopover from './MeetPopover'
import ProfilePanel from './ProfilePanel'

// How many messages a conversation streams at first; "Cargar mensajes
// anteriores" adds another page. Keeps opening a busy channel light.
const PAGE_SIZE = 50

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

// A conversation "has news" when its last message landed after the last
// time this user marked it read (users/{uid}.chatLastRead, see
// markChatRead in lib/firestore.js) — one timestamp per conversation, not
// a per-message read receipt.
function isUnread(lastMessageAt, lastReadAt) {
  if (!lastMessageAt?.toMillis) return false
  if (!lastReadAt?.toMillis) return true
  return lastMessageAt.toMillis() > lastReadAt.toMillis()
}

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#1E5FAD' }} />
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
        background: active ? 'rgba(30,95,173,0.14)' : undefined,
        color: active ? '#5B9BD9' : unread ? '#F5F5F5' : '#CCCCCC',
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
const VIEWS = [
  { id: 'inbox', label: 'Inbox', Icon: InboxIcon },
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
            style={{ background: active ? 'rgba(30,95,173,0.14)' : undefined, color: active ? '#5B9BD9' : count ? '#F5F5F5' : '#CCCCCC', fontWeight: count ? 600 : 500 }}
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

function ChatSidebar({ channels, groups, users, currentUid, selected, view, viewCounts, unreadMap, onSelect, onSelectView, onNewChannel, onNewGroup }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const match = (label) => !q || label.toLowerCase().includes(q)

  const otherUsers = users.filter((u) => u.id !== currentUid && match(userLabel(u)))
  const visibleGroups = groups.filter((g) => match(groupLabel(g, users, currentUid)))
  const publicChannels = channels.filter((c) => !isPrivate(c) && match(c.name))
  const privateChannels = channels.filter((c) => isPrivate(c) && match(c.name))
  const searching = q.length > 0
  const nothingFound = searching && !otherUsers.length && !visibleGroups.length && !publicChannels.length && !privateChannels.length

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
            placeholder="Buscar personas o canales..."
            className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
          />
        </div>
      </div>

      <ViewNav view={view} counts={viewCounts} onSelectView={onSelectView} />

      {nothingFound && <p className="px-2.5 text-[12px] text-[#444444]">Sin resultados para “{search}”.</p>}

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
                <Avatar displayName={userLabel(u)} photoURL={u.photoDataUrl} size={20} />
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
        className="mt-1.5 text-[12px] font-medium text-[#5B9BD9] hover:underline"
      >
        Activar avisos de llamada
      </button>
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

function HeaderButton({ title, onClick, active, children, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] px-3 text-[12px] text-[#AAAAAA] transition-colors duration-150 hover:border-white/[0.16] hover:text-[#F5F5F5]"
      style={active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
    >
      {children}
    </button>
  )
}

// Icon-only round buttons for calls, the way every messaging app's header
// does it — labeled buttons crowded out the person's name once the
// profile panel was open beside the thread. The tooltip still names them.
function IconButton({ title, onClick, active, children, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#AAAAAA] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
      style={active ? { background: 'rgba(255,255,255,0.08)', color: '#F5F5F5' } : undefined}
    >
      {children}
    </button>
  )
}

// Llamar / Videollamada both hand off to Google Meet — ADOR OS is where the
// call starts, Meet is the call's infrastructure. No in-app video. The
// popover's open state lives in ChatModule so the same flow can be started
// from here or from the profile panel's buttons.
function CallButtons({ openCall, onCall }) {
  const audioRef = useRef(null)
  const videoRef = useRef(null)
  return (
    <>
      <IconButton title="Llamar (Google Meet)" buttonRef={audioRef} active={openCall?.anchorRef === audioRef} onClick={() => onCall('audio', audioRef)}>
        <PhoneIcon size={15} />
      </IconButton>
      <IconButton title="Videollamada (Google Meet)" buttonRef={videoRef} active={openCall?.anchorRef === videoRef} onClick={() => onCall('video', videoRef)}>
        <VideoIcon size={16} />
      </IconButton>
    </>
  )
}

function ConversationHeader({ selected, conversation, dmUser, dmEntry, users, currentUid, infoOpen, profileOpen, onToggleInfo, onToggleProfile, openCall, onCall }) {
  if (selected.type === 'dm') {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <button
          type="button"
          onClick={onToggleProfile}
          title="Ver perfil"
          className="-ml-2 flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors duration-150 hover:bg-white/[0.04]"
          style={profileOpen ? { background: 'rgba(255,255,255,0.05)' } : undefined}
        >
          <Avatar displayName={dmEntry?.name || userLabel(dmUser)} photoURL={dmEntry?.photoDataUrl || dmUser?.photoDataUrl} size={30} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#F5F5F5]">{dmEntry?.name || userLabel(dmUser)}</p>
            <p className="truncate text-[11.5px] text-[#555555]">{[dmEntry?.role, dmEntry?.area].filter(Boolean).join(' · ') || 'Mensaje directo · solo ustedes dos'}</p>
          </div>
        </button>
        <div className="flex flex-shrink-0 items-center gap-1">
          <CallButtons openCall={openCall} onCall={onCall} />
        </div>
      </div>
    )
  }

  const kind = conversationKind(conversation)
  const priv = isPrivate(conversation)
  const memberCount = membersOf(conversation, users).length
  const title = kind === 'group' ? groupLabel(conversation, users, currentUid) : conversation.name
  const subtitle =
    kind === 'group'
      ? `Grupo privado · ${memberCount} personas`
      : priv
        ? `Canal privado · ${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}`
        : 'Canal de toda la empresa'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold text-[#F5F5F5]">
          {kind === 'channel' && (priv ? <LockIcon size={13} className="text-[#888888]" /> : <span className="text-[#666666]">#</span>)}
          <span className="truncate">{title}</span>
        </p>
        <p className="truncate text-[11.5px] text-[#555555]">
          {subtitle}
          {conversation.description ? ` · ${conversation.description}` : ''}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {kind === 'group' && <CallButtons openCall={openCall} onCall={onCall} />}
        <HeaderButton title="Detalles y permisos" onClick={onToggleInfo} active={infoOpen}>
          <InfoIcon size={14} /> Detalles
        </HeaderButton>
      </div>
    </div>
  )
}

export default function ChatModule({ user, focus, onFocusHandled }) {
  const [allChannels, setAllChannels] = useState([])
  const [users, setUsers] = useState([])
  const [myDms, setMyDms] = useState([])
  const [profile, setProfile] = useState(null)
  const [selected, setSelected] = useState(null) // {type:'conv', id} | {type:'dm', id: otherUid}
  const [messages, setMessages] = useState([])
  const [modal, setModal] = useState(null) // 'channel' | 'group' | null
  // One right-hand panel at a time: a channel/group's Detalles, or a
  // person's profile (from a DM header or an author name in a channel).
  const [panel, setPanel] = useState(null) // {type:'info'} | {type:'profile', uid} | null
  const [openCall, setOpenCall] = useState(null) // {type, anchorRef} | null
  const [searchQuery, setSearchQuery] = useState(null) // null = search bar closed
  const [directory, setDirectory] = useState([])
  // The sidebar's top section: Inbox / Menciones / Guardados / Archivos.
  // While one is open, no conversation is "open" — nothing streams and
  // nothing gets marked read behind the reader's back.
  const [view, setView] = useState(null)
  const [mentions, setMentions] = useState([])
  const [saved, setSaved] = useState([])
  const [files, setFiles] = useState([])
  const [messageLimit, setMessageLimit] = useState(PAGE_SIZE)
  const [lightbox, setLightbox] = useState(null)
  const jumpToRef = useRef(null)
  const showToast = useToast()
  const actorName = actorNameFor(user)

  useEffect(() => subscribeChatChannels(setAllChannels), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeMyDms(user.uid, setMyDms), [user.uid])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])
  useEffect(() => subscribeDirectoryPeople(setDirectory), [])
  useEffect(() => subscribeMyMentions(user.uid, setMentions), [user.uid])
  useEffect(() => subscribeMySaved(user.uid, setSaved), [user.uid])
  // Archivos is the only index that grows with the whole team's activity,
  // so it's only listened to while that view is actually open.
  useEffect(() => (view === 'files' ? subscribeChatFiles(setFiles) : undefined), [view])

  // Private channels/groups you're not in are never listed — you can't
  // find them, let alone join them. See lib/chat.js isMember().
  const visible = allChannels.filter((c) => isMember(c, user.uid))
  const channels = visible.filter((c) => conversationKind(c) === 'channel')
  const groups = visible.filter((c) => conversationKind(c) === 'group')

  const conversation = selected?.type === 'conv' ? visible.find((c) => c.id === selected.id) : null
  const dmUser = selected?.type === 'dm' ? users.find((u) => u.id === selected.id) : null

  // Default to #general (or the first channel) once channels load, so the
  // screen never opens on a dead "nothing selected" state. Also recovers
  // if you're removed from the conversation you're looking at.
  useEffect(() => {
    const stillThere = selected && (selected.type === 'dm' || visible.some((c) => c.id === selected.id))
    if (stillThere) return
    const fallback = channels.find((c) => c.name === 'general') || channels[0] || groups[0]
    setSelected(fallback ? { type: 'conv', id: fallback.id } : null)
  }, [allChannels, selected])

  const selectedConversationId = selected ? (selected.type === 'conv' ? selected.id : dmIdFor(user.uid, selected.id)) : null
  const activeConversationId = view ? null : selectedConversationId
  const convType = selected?.type === 'dm' ? 'dm' : 'conv'
  const directoryFor = (uid) => directory.find((p) => p.linkedUserId === uid)

  // Search is scoped to the open conversation — close it when you move.
  // An open profile follows you into another DM (it's "who am I talking
  // to"), the same way Slack's member panel does.
  useEffect(() => {
    setSearchQuery(null)
    setMessageLimit(PAGE_SIZE)
    if (selected?.type === 'dm') setPanel((p) => (p?.type === 'profile' ? { type: 'profile', uid: selected.id } : p))
  }, [activeConversationId])

  // Clear the thread only when switching conversations, not when paging
  // older messages in (that would flash the thread empty).
  useEffect(() => setMessages([]), [activeConversationId])

  useEffect(() => {
    if (!activeConversationId) return setMessages([])
    return subscribeMessages(convType, activeConversationId, messageLimit, setMessages)
  }, [activeConversationId, messageLimit])


  // Jump-to-message from Menciones / Guardados / the bell: once the target
  // conversation's messages are on screen, scroll to it and flash it.
  useEffect(() => {
    const id = jumpToRef.current
    if (!id) return
    const el = document.getElementById(`msg-${id}`)
    if (!el) return
    jumpToRef.current = null
    el.scrollIntoView({ block: 'center' })
    el.animate([{ background: 'rgba(184,134,11,0.18)' }, { background: 'transparent' }], { duration: 1800, easing: 'ease-out' })
  }, [messages])

  // Marks the open conversation read whenever its message list changes —
  // covers both "I just opened it" and "a new message arrived while I'm
  // already looking at it."
  useEffect(() => {
    if (!activeConversationId) return
    markChatRead(user.uid, activeConversationId)
  }, [activeConversationId, messages, user.uid])

  const lastReadFor = (convId) => profile?.chatLastRead?.[convId]
  const isMuted = (convId) => Boolean(profile?.chatMuted?.[convId])
  const unreadMap = {}
  for (const c of visible) unreadMap[c.id] = !isMuted(c.id) && isUnread(c.lastMessageAt, lastReadFor(c.id))
  for (const d of myDms) unreadMap[d.id] = !isMuted(d.id) && isUnread(d.updatedAt, lastReadFor(d.id))

  const fail = (verb) => (error) => showToast(`No se pudo ${verb}: ${error.message}`)

  const nameOf = (uid) => userLabel(users.find((u) => u.id === uid))

  // Human label for any conversation, resolved from live data (so a
  // renamed channel or group shows its current name everywhere).
  const labelFor = (type, convId, participantUids) => {
    if (type === 'dm') {
      const other = (participantUids || []).find((uid) => uid !== user.uid)
      return other ? nameOf(other) : 'Mensaje directo'
    }
    const c = allChannels.find((x) => x.id === convId)
    if (!c) return 'Conversación'
    return conversationKind(c) === 'group' ? groupLabel(c, users, user.uid) : `#${c.name}`
  }

  // Everything the index collections (mentions, saved, files) need to
  // point back at the open conversation.
  const convMeta = () => ({
    convType,
    convId: selectedConversationId,
    conversationKey: selectedConversationId,
    conversationLabel: labelFor(convType, selectedConversationId, convType === 'dm' ? [user.uid, selected.id] : null),
    ...(convType === 'dm' ? { participantUids: [user.uid, selected.id] } : {}),
  })

  // Opens a conversation from any index entry (Inbox, Menciones,
  // Guardados, Archivos, the bell) and optionally jumps to one message.
  const openConversation = ({ convType: type, convId, participantUids, messageId }) => {
    jumpToRef.current = messageId || null
    setView(null)
    if (type === 'dm') {
      const other = (participantUids || []).find((uid) => uid !== user.uid)
      if (other) setSelected({ type: 'dm', id: other })
    } else if (visible.some((c) => c.id === convId)) {
      setSelected({ type: 'conv', id: convId })
    } else {
      showToast('Ya no tienes acceso a esa conversación.')
    }
  }

  // A request from the bell. Channel targets wait until channels have
  // loaded, so access can actually be checked.
  useEffect(() => {
    if (focus?.type !== 'chat') return
    if (!focus.view && focus.convType === 'conv' && !allChannels.length) return
    if (focus.view) setView(focus.view)
    else openConversation(focus)
    onFocusHandled?.()
  }, [focus, allChannels.length])

  const lastReadMs = (key) => lastReadFor(key)?.toMillis?.() || 0
  const visibleKeys = new Set([...visible.map((c) => c.id), ...myDms.map((d) => d.id)])
  const myMentions = mentions
    .filter((m) => visibleKeys.has(m.conversationKey))
    .map((m) => ({ ...m, conversationLabel: labelFor(m.convType, m.convId), unread: (m.createdAt?.toMillis?.() || 0) > lastReadMs(m.conversationKey) }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  const mySaved = saved
    .map((x) => ({ ...x, conversationLabel: labelFor(x.convType, x.convId, x.participantUids) }))
    .sort((a, b) => (b.savedAt?.toMillis?.() || 0) - (a.savedAt?.toMillis?.() || 0))
  const savedIds = new Set(saved.map((x) => x.messageId))
  const myFiles = files.filter((f) => visibleKeys.has(f.conversationKey)).map((f) => ({ ...f, conversationLabel: labelFor(f.convType, f.convId, f.participantUids) }))

  const inboxConversations = [
    ...visible.map((c) => ({
      key: c.id,
      convType: 'conv',
      convId: c.id,
      kind: conversationKind(c),
      private: isPrivate(c),
      memberCount: (c.memberUids || []).length,
      label: conversationKind(c) === 'group' ? groupLabel(c, users, user.uid) : c.name,
      lastMessage: c.lastMessage,
      lastAt: c.lastMessageAt,
      unread: unreadMap[c.id],
    })),
    ...myDms.map((d) => {
      const other = (d.participantUids || []).find((uid) => uid !== user.uid)
      const otherUser = users.find((u) => u.id === other)
      return {
        key: d.id,
        convType: 'dm',
        convId: d.id,
        participantUids: d.participantUids,
        label: otherUser ? userLabel(otherUser) : d.participantNames?.[other] || 'Mensaje directo',
        photo: otherUser?.photoDataUrl,
        lastMessage: d.lastMessage,
        lastAt: d.updatedAt,
        unread: unreadMap[d.id],
      }
    }),
  ].sort((a, b) => (b.lastAt?.toMillis?.() || 0) - (a.lastAt?.toMillis?.() || 0))

  const viewCounts = {
    inbox: inboxConversations.filter((c) => c.unread && c.lastMessage).length,
    mentions: myMentions.filter((m) => m.unread).length,
  }

  const mentionCandidates =
    selected?.type === 'conv' && conversation
      ? membersOf(conversation, users)
          .filter((uid) => uid !== user.uid)
          .map((uid) => {
            const u = users.find((x) => x.id === uid)
            return { uid, name: userLabel(u), photo: u?.photoDataUrl }
          })
      : []

  const handleCreate = (data) =>
    withTimeout(createChatChannel(data, user.uid, actorName))
      .then((ref) => {
        setSelected({ type: 'conv', id: ref.id })
        setModal(null)
      })
      .catch(fail(data.kind === 'group' ? 'crear el grupo' : 'crear el canal'))

  // One send path for everything the composer produces. Heavy media goes
  // to chatBlobs first (only a thumbnail rides in the message), then the
  // message, then the small index docs (mentions, files) pointing at it.
  const handleSend = async (draft) => {
    const meta = convMeta()
    try {
      let attachment
      if (draft.image) {
        const blob = await withTimeout(createChatBlob(draft.image.fullDataUrl, 'image'))
        attachment = { kind: 'image', thumbUrl: draft.image.thumbUrl, blobId: blob.id, name: draft.image.name }
      } else if (draft.voice) {
        const blob = await withTimeout(createChatBlob(draft.voice.dataUrl, 'voice'))
        attachment = { kind: 'voice', blobId: blob.id, duration: Math.round(draft.voice.duration), name: 'Nota de voz' }
      }
      const payload = { text: draft.text || '', attachment, call: draft.call, mentions: draft.mentions }
      const ref =
        convType === 'conv'
          ? await withTimeout(sendChannelMessage(selected.id, payload, user.uid, actorName))
          : await withTimeout(
              sendDmMessage(selectedConversationId, [{ uid: user.uid, name: actorName }, { uid: selected.id, name: userLabel(dmUser) }], payload, user.uid, actorName)
            )

      const pointer = { ...meta, messageId: ref.id, authorName: actorName, authorUid: user.uid }
      if (convType === 'conv' && draft.mentions?.length) createMentions(draft.mentions, { ...pointer, text: (draft.text || '').slice(0, 200) }, user.uid, actorName).catch(() => {})
      if (attachment?.kind === 'image') indexChatFile({ ...pointer, kind: 'image', thumbUrl: attachment.thumbUrl, blobId: attachment.blobId, name: attachment.name }).catch(() => {})
      if (attachment?.kind === 'voice') indexChatFile({ ...pointer, kind: 'voice', blobId: attachment.blobId, duration: attachment.duration, name: 'Nota de voz' }).catch(() => {})
      const drive = findDriveLink(draft.text)
      if (drive) indexChatFile({ ...pointer, kind: 'drive', url: drive, name: `${driveDocType(drive)} de Drive` }).catch(() => {})
    } catch (error) {
      fail('enviar')(error)
    }
  }

  const handleReact = (messageId, emoji, has) =>
    withTimeout(toggleMessageReaction(convType, selectedConversationId, messageId, emoji, user.uid, has)).catch(fail('reaccionar'))

  const handleToggleSave = (message) =>
    withTimeout(toggleSavedMessage(user.uid, message, convMeta(), savedIds.has(message.id))).catch(fail('guardar el mensaje'))

  const handleEditMessage = (messageId, text) => {
    const p = selected.type === 'conv' ? updateChannelMessage(selected.id, messageId, text) : updateDmMessage(activeConversationId, messageId, text)
    withTimeout(p).catch(fail('editar'))
  }

  const handleDeleteMessage = (messageId) => {
    const p = selected.type === 'conv' ? deleteChannelMessage(selected.id, messageId) : deleteDmMessage(activeConversationId, messageId)
    withTimeout(p)
      .then(() => cleanupMessageIndexes(messageId))
      .catch(fail('eliminar'))
  }

  const infoActions = conversation && {
    onUpdate: (patch) => withTimeout(updateChatChannel(conversation.id, patch)).catch(fail('guardar')),
    onAddMembers: (uids) => withTimeout(addChannelMembers(conversation.id, uids)).catch(fail('añadir miembros')),
    onRemoveMember: (uid) => withTimeout(removeChannelMember(conversation.id, uid)).catch(fail('quitar al miembro')),
    onConvert: (name, visibility) => withTimeout(convertGroupToChannel(conversation.id, name, visibility)).catch(fail('convertir el grupo')),
  }

  // Besides the call card in the thread, a call also writes a short-lived
  // chatCalls doc so the other person's ADOR OS rings wherever they are in
  // the app (IncomingCallGate.jsx). Calls only start from DMs and groups.
  const ringRecipients = (type, url) => {
    const isDm = selected.type === 'dm'
    const toUids = isDm ? [selected.id] : (conversation?.memberUids || []).filter((uid) => uid !== user.uid)
    if (!toUids.length) return
    const conversationLabel = isDm ? 'Mensaje directo' : `Grupo · ${groupLabel(conversation, users, user.uid)}`
    withTimeout(createChatCall({ type, url, toUids, conversationLabel, conversationKey: activeConversationId }, user.uid, actorName)).catch(fail('avisar la llamada'))
  }

  const toggleCall = (type, anchorRef) => setOpenCall((cur) => (cur?.anchorRef === anchorRef ? null : { type, anchorRef }))

  // A profile opened from a channel whose "Llamar" is pressed: jump into
  // the DM with that person first, so the Meet card lands there.
  const callFromProfile = (uid, type, anchorRef) => {
    if (selected?.type !== 'dm' || selected.id !== uid) setSelected({ type: 'dm', id: uid })
    toggleCall(type, anchorRef)
  }

  const showInfo = panel?.type === 'info' && conversation
  const profileUid = panel?.type === 'profile' ? panel.uid : null
  const profileUser = profileUid ? users.find((u) => u.id === profileUid) : null
  const profileInDm = selected?.type === 'dm' && selected.id === profileUid

  return (
    <div className="mx-auto flex h-full w-full max-w-[1320px] gap-8 px-12 py-8">
      <ChatSidebar
        channels={channels}
        groups={groups}
        users={users}
        currentUid={user.uid}
        selected={selected}
        view={view}
        viewCounts={viewCounts}
        unreadMap={unreadMap}
        onSelect={(sel) => {
          setView(null)
          setSelected(sel)
        }}
        onSelectView={setView}
        onNewChannel={() => setModal('channel')}
        onNewGroup={() => setModal('group')}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {view === 'inbox' ? (
          <InboxView conversations={inboxConversations} onOpen={openConversation} />
        ) : view === 'mentions' ? (
          <MentionsView mentions={myMentions} onOpen={openConversation} />
        ) : view === 'saved' ? (
          <SavedView
            saved={mySaved}
            onOpen={openConversation}
            onUnsave={(x) => withTimeout(toggleSavedMessage(user.uid, { id: x.messageId }, {}, true)).catch(fail('quitar el guardado'))}
          />
        ) : view === 'files' ? (
          <FilesView files={myFiles} onOpen={openConversation} onOpenImage={setLightbox} />
        ) : selected && (conversation || dmUser) ? (
          <>
            <ConversationHeader
              selected={selected}
              conversation={conversation}
              dmUser={dmUser}
              dmEntry={dmUser && directoryFor(dmUser.id)}
              users={users}
              currentUid={user.uid}
              infoOpen={showInfo}
              profileOpen={Boolean(profileUid) && profileInDm}
              onToggleInfo={() => setPanel((p) => (p?.type === 'info' ? null : { type: 'info' }))}
              onToggleProfile={() => setPanel((p) => (p?.type === 'profile' && p.uid === selected.id ? null : { type: 'profile', uid: selected.id }))}
              openCall={openCall}
              onCall={toggleCall}
            />
            {searchQuery !== null && (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-3.5 py-2">
                <SearchIcon size={12} className="text-[#666666]" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setSearchQuery(null)}
                  placeholder="Buscar en esta conversación..."
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
                />
                <button type="button" onClick={() => setSearchQuery(null)} className="text-[11.5px] text-[#666666] hover:text-[#F5F5F5]">
                  Cerrar
                </button>
              </div>
            )}
            <MessageThread
              messages={messages}
              currentUid={user.uid}
              query={searchQuery}
              hasMore={messages.length >= messageLimit}
              onLoadMore={() => setMessageLimit((n) => n + PAGE_SIZE)}
              savedIds={savedIds}
              userName={nameOf}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onOpenProfile={(uid) => setPanel({ type: 'profile', uid })}
              onReact={handleReact}
              onToggleSave={handleToggleSave}
              onOpenImage={setLightbox}
            />
            <Composer
              key={selectedConversationId}
              onSend={handleSend}
              onError={showToast}
              mentionCandidates={mentionCandidates}
              placeholder={selected.type === 'dm' ? `Mensaje a ${userLabel(dmUser).split(' ')[0]}...` : mentionCandidates.length ? 'Escribe un mensaje... usa @ para mencionar' : undefined}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageIcon size={20} className="text-[#333333]" />
            <p className="max-w-[360px] text-[13px] leading-relaxed text-[#444444]">
              Escribe un mensaje directo a alguien, abre un grupo privado, o crea el primer canal — empieza por <span className="text-[#888888]">#general</span>.
            </p>
            <button type="button" onClick={() => setModal('channel')} className="ador-btn-primary mt-3 rounded-xl px-4 py-2 text-[12.5px] font-medium">
              Crear canal
            </button>
          </div>
        )}
      </div>

      {lightbox && <ImageLightbox attachment={lightbox} onClose={() => setLightbox(null)} />}

      {showInfo && !view && (
        <ConversationInfoPanel
          conversation={conversation}
          users={users}
          currentUid={user.uid}
          existingNames={channels.map((c) => c.name)}
          onClose={() => setPanel(null)}
          {...infoActions}
        />
      )}

      {profileUser && !view && (
        <ProfilePanel
          key={profileUid}
          person={profileUser}
          directoryEntry={directoryFor(profileUid)}
          inDm={profileInDm}
          messages={profileInDm ? messages : []}
          muted={isMuted(dmIdFor(user.uid, profileUid))}
          searching={profileInDm && searchQuery !== null}
          onClose={() => setPanel(null)}
          onMessage={() => setSelected({ type: 'dm', id: profileUid })}
          onCall={(type, anchorRef) => callFromProfile(profileUid, type, anchorRef)}
          onToggleSearch={() => setSearchQuery((q) => (q === null ? '' : null))}
          onOpenImage={setLightbox}
          onToggleMute={() => withTimeout(setChatMuted(user.uid, dmIdFor(user.uid, profileUid), !isMuted(dmIdFor(user.uid, profileUid)))).catch(fail('silenciar'))}
        />
      )}

      {openCall && (
        <MeetPopover
          key={openCall.type}
          type={openCall.type}
          anchorRef={openCall.anchorRef}
          onClose={() => setOpenCall(null)}
          onSend={(url) => {
            handleSend({ call: { type: openCall.type, url } })
            ringRecipients(openCall.type, url)
            setOpenCall(null)
          }}
        />
      )}

      {modal && (
        <NewConversationModal
          kind={modal}
          users={users}
          currentUid={user.uid}
          existingNames={channels.map((c) => c.name)}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

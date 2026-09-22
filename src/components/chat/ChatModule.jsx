import { useEffect, useRef, useState } from 'react'
import {
  subscribeChatChannels,
  createChatChannel,
  subscribeChannelMessages,
  sendChannelMessage,
  updateChannelMessage,
  deleteChannelMessage,
  subscribeUsers,
  dmIdFor,
  subscribeMyDms,
  subscribeDmMessages,
  sendDmMessage,
  updateDmMessage,
  deleteDmMessage,
  markChatRead,
  subscribeUserProfile,
} from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { MessageIcon, PlusIcon, ArrowRightIcon, EditIcon, CloseIcon, SearchIcon } from '../icons'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

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

// A conversation "has news" when its last message landed after the last
// time this user marked it read (users/{uid}.chatLastRead, see
// markChatRead in lib/firestore.js) — never a separately-tracked read
// receipt per message, just one timestamp per conversation, same "small
// state, no new collection" instinct as this app's other per-user prefs.
function isUnread(lastMessageAt, lastReadAt) {
  if (!lastMessageAt?.toMillis) return false
  if (!lastReadAt?.toMillis) return true
  return lastMessageAt.toMillis() > lastReadAt.toMillis()
}

function UnreadDot() {
  return <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#1E5FAD' }} />
}

// Slack-style: a small "+" icon right next to the "CANALES" header opens
// an inline input in place of the list — not the small easy-to-miss text
// link the first pass used at the bottom of the channel list, which a
// direct bug report showed gets lost next to GlobalCapture's much more
// visually prominent floating "+" (an app-wide quick-note button,
// unrelated to Chat — see AppShell.jsx). No isAdmin gate here (unlike
// every admin-gated collection elsewhere in this app): anyone can spin up
// a channel, same "open, informal" posture as Comunidad, direct user
// choice for Chat's v1.
function NewChannelInput({ onCreate, onDone }) {
  const [name, setName] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    setName('')
    onDone()
  }

  return (
    <input
      autoFocus
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') onDone()
      }}
      onBlur={() => !name.trim() && onDone()}
      placeholder="Nombre del canal..."
      className="w-full rounded-md border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
    />
  )
}

// Falls back through displayName → email → a labeled placeholder — never a
// blank name next to a bare "?" avatar. A user doc missing both usually
// means an incomplete/stale profile (e.g. an account whose Auth record has
// no displayName and, unusually, no email either); this can't fix that
// account's data, but it can stop rendering it as an unexplained blank.
function userLabel(u) {
  return u.displayName || u.email || 'Usuario sin nombre'
}

function ChatSidebar({ channels, users, currentUid, selected, unreadMap, onSelectChannel, onSelectDm, onCreateChannel }) {
  const [addingChannel, setAddingChannel] = useState(false)
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const otherUsers = users.filter((u) => u.id !== currentUid)
  const filteredChannels = q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : channels
  const filteredUsers = q ? otherUsers.filter((u) => userLabel(u).toLowerCase().includes(q)) : otherUsers
  const searching = q.length > 0

  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-5">
      {/* Slack's own top search box — filters channels and people together,
          so finding "did we already have a #marketing channel" or
          "start a DM with Leo" is the same box instead of two separate
          hunts through the sidebar. Real user request: search for a
          person/channel and jump straight into it. */}
      <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5">
        <SearchIcon size={12} className="text-[#666666]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar personas o canales..."
          className="w-full bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Canales</p>
          <button
            type="button"
            onClick={() => setAddingChannel(true)}
            title="Nuevo canal"
            className="flex h-5 w-5 items-center justify-center rounded-full text-[#666666] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <PlusIcon size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {addingChannel && (
            <div className="px-1 pb-1">
              <NewChannelInput onCreate={onCreateChannel} onDone={() => setAddingChannel(false)} />
            </div>
          )}
          {filteredChannels.map((c) => {
            const active = selected?.type === 'channel' && selected.id === c.id
            const unread = !active && unreadMap[c.id]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChannel(c)}
                className="flex items-center justify-between gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150"
                style={{
                  background: active ? 'rgba(30,95,173,0.14)' : 'transparent',
                  color: active ? '#5B9BD9' : unread ? '#F5F5F5' : '#CCCCCC',
                  fontWeight: unread ? 600 : 500,
                }}
              >
                <span className="truncate"># {c.name}</span>
                {unread && <UnreadDot />}
              </button>
            )
          })}
          {channels.length === 0 && !addingChannel && !searching && <p className="px-2.5 py-1 text-[12px] text-[#444444]">Sin canales todavía</p>}
          {searching && filteredChannels.length === 0 && <p className="px-2.5 py-1 text-[12px] text-[#444444]">Sin canales que coincidan</p>}
        </div>
      </div>

      <div>
        <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Mensajes directos</p>
        <div className="flex flex-col gap-0.5">
          {otherUsers.length === 0 && !searching && (
            <p className="px-2.5 py-1 text-[11.5px] leading-relaxed text-[#444444]">
              Aparecerán aquí en cuanto tus socios entren a ADOR OS por primera vez.
            </p>
          )}
          {searching && filteredUsers.length === 0 && otherUsers.length > 0 && <p className="px-2.5 py-1 text-[12px] text-[#444444]">Sin personas que coincidan</p>}
          {filteredUsers
            .map((u) => {
              const active = selected?.type === 'dm' && selected.otherUid === u.id
              const convId = dmIdFor(currentUid, u.id)
              const unread = !active && unreadMap[convId]
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelectDm(u)}
                  className="flex items-center justify-between gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150"
                  style={{ background: active ? 'rgba(30,95,173,0.14)' : 'transparent', color: active ? '#5B9BD9' : unread ? '#F5F5F5' : '#CCCCCC', fontWeight: unread ? 600 : 500 }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar displayName={userLabel(u)} photoURL={u.photoDataUrl} size={20} />
                    <span className="truncate">{userLabel(u)}</span>
                  </span>
                  {unread && <UnreadDot />}
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

// Hover reveals small edit/delete actions on your own messages, matching
// the expectation any real chat sets (Slack, iMessage, WhatsApp all let
// you fix or retract something you just sent) — the original v1 had no
// way to correct or take back a sent message at all.
function MessageBubble({ message, mine, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.text)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (editing) {
    return (
      <div className="flex max-w-[70%] flex-col gap-1 items-end">
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
    <div className={`group flex max-w-[70%] flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
      {!mine && <p className="px-1 text-[11px] font-medium text-[#666666]">{message.authorName}</p>}
      <div className="flex items-center gap-1.5">
        {mine && (
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <button type="button" onClick={() => setEditing(true)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#666666] hover:bg-white/[0.06] hover:text-[#F5F5F5]">
              <EditIcon size={11} />
            </button>
            <button
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#EF5350]/10"
              style={{ color: confirmDelete ? '#EF5350' : '#666666' }}
            >
              <CloseIcon size={11} />
            </button>
          </span>
        )}
        <div
          className="rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed"
          style={{
            background: mine ? '#1E5FAD' : 'rgba(255,255,255,0.06)',
            color: mine ? '#F5F5F5' : '#DDDDDD',
            borderBottomRightRadius: mine ? 4 : undefined,
            borderBottomLeftRadius: mine ? undefined : 4,
          }}
        >
          {message.text}
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

function MessageThread({ messages, currentUid, onEdit, onDelete }) {
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

function Composer({ onSend }) {
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Escribe un mensaje..."
        className="min-w-0 flex-1 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[13.5px] text-[#F5F5F5] placeholder:text-[#666666] outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#F5F5F5] transition-opacity duration-150 disabled:opacity-40"
        style={{ background: '#1E5FAD' }}
      >
        <ArrowRightIcon size={16} />
      </button>
    </div>
  )
}

export default function ChatModule({ user }) {
  const [channels, setChannels] = useState([])
  const [users, setUsers] = useState([])
  const [myDms, setMyDms] = useState([])
  const [profile, setProfile] = useState(null)
  const [selected, setSelected] = useState(null) // {type:'channel', id, name} | {type:'dm', otherUid, otherName}
  const [messages, setMessages] = useState([])
  const showToast = useToast()
  const actorName = actorNameFor(user)

  useEffect(() => subscribeChatChannels(setChannels), [])
  useEffect(() => subscribeUsers(setUsers), [])
  useEffect(() => subscribeMyDms(user.uid, setMyDms), [user.uid])
  useEffect(() => subscribeUserProfile(user?.uid, setProfile), [user?.uid])

  // Default to the first available channel once channels load, so the
  // screen never opens on a dead "nothing selected" state.
  useEffect(() => {
    if (!selected && channels.length > 0) setSelected({ type: 'channel', id: channels[0].id, name: channels[0].name })
  }, [channels, selected])

  const activeConversationId = selected ? (selected.type === 'channel' ? selected.id : dmIdFor(user.uid, selected.otherUid)) : null

  useEffect(() => {
    if (!selected) return
    if (selected.type === 'channel') return subscribeChannelMessages(selected.id, setMessages)
    return subscribeDmMessages(dmIdFor(user.uid, selected.otherUid), setMessages)
  }, [selected, user.uid])

  // Marks the open conversation read whenever its message list changes —
  // covers both "I just opened it" and "a new message arrived while I'm
  // already looking at it," so the unread dot never lingers on a
  // conversation you're actively viewing.
  useEffect(() => {
    if (!activeConversationId) return
    markChatRead(user.uid, activeConversationId)
  }, [activeConversationId, messages, user.uid])

  const lastReadFor = (convId) => profile?.chatLastRead?.[convId]
  const unreadMap = {}
  for (const c of channels) unreadMap[c.id] = isUnread(c.lastMessageAt, lastReadFor(c.id))
  for (const d of myDms) unreadMap[d.id] = isUnread(d.updatedAt, lastReadFor(d.id))

  const handleCreateChannel = (name) => {
    withTimeout(createChatChannel(name, user.uid, actorName))
      .then((ref) => setSelected({ type: 'channel', id: ref.id, name }))
      .catch((error) => showToast(`No se pudo crear el canal: ${error.message}`))
  }

  const handleSend = (text) => {
    if (selected.type === 'channel') {
      withTimeout(sendChannelMessage(selected.id, text, user.uid, actorName)).catch((error) => showToast(`No se pudo enviar: ${error.message}`))
    } else {
      const dmId = dmIdFor(user.uid, selected.otherUid)
      const participants = [
        { uid: user.uid, name: actorName },
        { uid: selected.otherUid, name: selected.otherName },
      ]
      withTimeout(sendDmMessage(dmId, participants, text, user.uid, actorName)).catch((error) => showToast(`No se pudo enviar: ${error.message}`))
    }
  }

  const handleEditMessage = (messageId, text) => {
    const fn = selected.type === 'channel' ? updateChannelMessage(selected.id, messageId, text) : updateDmMessage(dmIdFor(user.uid, selected.otherUid), messageId, text)
    withTimeout(fn).catch((error) => showToast(`No se pudo editar: ${error.message}`))
  }

  const handleDeleteMessage = (messageId) => {
    const fn = selected.type === 'channel' ? deleteChannelMessage(selected.id, messageId) : deleteDmMessage(dmIdFor(user.uid, selected.otherUid), messageId)
    withTimeout(fn).catch((error) => showToast(`No se pudo eliminar: ${error.message}`))
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] gap-8 px-12 py-8">
      <ChatSidebar
        channels={channels}
        users={users}
        currentUid={user?.uid}
        selected={selected}
        unreadMap={unreadMap}
        onSelectChannel={(c) => setSelected({ type: 'channel', id: c.id, name: c.name })}
        onSelectDm={(u) => setSelected({ type: 'dm', otherUid: u.id, otherName: userLabel(u) })}
        onCreateChannel={handleCreateChannel}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="border-b border-white/[0.06] pb-3">
              <p className="text-[15px] font-semibold text-[#F5F5F5]">{selected.type === 'channel' ? `# ${selected.name}` : selected.otherName}</p>
            </div>
            <MessageThread messages={messages} currentUid={user?.uid} onEdit={handleEditMessage} onDelete={handleDeleteMessage} />
            <Composer onSend={handleSend} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageIcon size={20} className="text-[#333333]" />
            <p className="text-[13px] text-[#444444]">
              Elige un canal, inicia uno nuevo, o escribe un mensaje directo — no hace falta un canal para eso.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

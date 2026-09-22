import { useEffect, useRef, useState } from 'react'
import {
  subscribeChatChannels,
  createChatChannel,
  subscribeChannelMessages,
  sendChannelMessage,
  subscribeUsers,
  dmIdFor,
  subscribeDmMessages,
  sendDmMessage,
} from '../../lib/firestore'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import Avatar from '../shell/Avatar'
import { MessageIcon, PlusIcon, ArrowRightIcon } from '../icons'

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

function formatTime(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

// New-channel row — a plain text input inline in the sidebar, not a modal.
// No isAdmin gate here (unlike every admin-gated collection elsewhere in
// this app): anyone can spin up a channel, same "open, informal" posture
// as Comunidad, direct user choice for Chat's v1.
function NewChannelRow({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    setName('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#666666] transition-colors duration-150 hover:text-[#F5F5F5]"
      >
        <PlusIcon size={11} /> Nuevo canal
      </button>
    )
  }

  return (
    <input
      autoFocus
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') setOpen(false)
      }}
      onBlur={() => !name.trim() && setOpen(false)}
      placeholder="Nombre del canal..."
      className="w-full rounded-md border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[12px] text-[#F5F5F5] placeholder:text-[#444444] outline-none"
    />
  )
}

function ChatSidebar({ channels, users, currentUid, selected, onSelectChannel, onSelectDm, onCreateChannel }) {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-5">
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Canales</p>
        </div>
        <div className="flex flex-col gap-0.5">
          {channels.map((c) => {
            const active = selected?.type === 'channel' && selected.id === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChannel(c)}
                className="truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-150"
                style={{ background: active ? 'rgba(30,95,173,0.14)' : 'transparent', color: active ? '#5B9BD9' : '#CCCCCC' }}
              >
                # {c.name}
              </button>
            )
          })}
          <div className="px-1 pt-1">
            <NewChannelRow onCreate={onCreateChannel} />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#444444]">Mensajes directos</p>
        <div className="flex flex-col gap-0.5">
          {users
            .filter((u) => u.id !== currentUid)
            .map((u) => {
              const active = selected?.type === 'dm' && selected.otherUid === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelectDm(u)}
                  className="flex items-center gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-150"
                  style={{ background: active ? 'rgba(30,95,173,0.14)' : 'transparent', color: active ? '#5B9BD9' : '#CCCCCC' }}
                >
                  <Avatar displayName={u.displayName} photoURL={u.photoDataUrl} size={20} />
                  <span className="truncate">{u.displayName || u.email}</span>
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

function MessageThread({ messages, currentUid }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

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
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[70%] flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                {!mine && <p className="px-1 text-[11px] font-medium text-[#666666]">{m.authorName}</p>}
                <div
                  className="rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed"
                  style={{
                    background: mine ? '#1E5FAD' : 'rgba(255,255,255,0.06)',
                    color: mine ? '#F5F5F5' : '#DDDDDD',
                    borderBottomRightRadius: mine ? 4 : undefined,
                    borderBottomLeftRadius: mine ? undefined : 4,
                  }}
                >
                  {m.text}
                </div>
                <p className="px-1 text-[10.5px] text-[#444444]">{formatTime(m.createdAt)}</p>
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
  const [selected, setSelected] = useState(null) // {type:'channel', id, name} | {type:'dm', otherUid, otherName}
  const [messages, setMessages] = useState([])
  const showToast = useToast()
  const actorName = actorNameFor(user)

  useEffect(() => subscribeChatChannels(setChannels), [])
  useEffect(() => subscribeUsers(setUsers), [])

  // Default to the first available channel once channels load, so the
  // screen never opens on a dead "nothing selected" state.
  useEffect(() => {
    if (!selected && channels.length > 0) setSelected({ type: 'channel', id: channels[0].id, name: channels[0].name })
  }, [channels, selected])

  useEffect(() => {
    if (!selected) return
    if (selected.type === 'channel') return subscribeChannelMessages(selected.id, setMessages)
    return subscribeDmMessages(dmIdFor(user.uid, selected.otherUid), setMessages)
  }, [selected, user.uid])

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

  return (
    <div className="mx-auto flex h-full w-full max-w-[1200px] gap-8 px-12 py-8">
      <ChatSidebar
        channels={channels}
        users={users}
        currentUid={user?.uid}
        selected={selected}
        onSelectChannel={(c) => setSelected({ type: 'channel', id: c.id, name: c.name })}
        onSelectDm={(u) => setSelected({ type: 'dm', otherUid: u.id, otherName: u.displayName || u.email })}
        onCreateChannel={handleCreateChannel}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="border-b border-white/[0.06] pb-3">
              <p className="text-[15px] font-semibold text-[#F5F5F5]">{selected.type === 'channel' ? `# ${selected.name}` : selected.otherName}</p>
            </div>
            <MessageThread messages={messages} currentUid={user?.uid} />
            <Composer onSend={handleSend} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageIcon size={20} className="text-[#333333]" />
            <p className="text-[13px] text-[#444444]">Crea un canal para empezar a conversar con el equipo.</p>
          </div>
        )}
      </div>
    </div>
  )
}

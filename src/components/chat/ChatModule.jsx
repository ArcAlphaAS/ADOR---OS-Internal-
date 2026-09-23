import { useEffect, useRef, useState } from 'react'
import {
  createChatChannel,
  updateChatChannel,
  addChannelMembers,
  removeChannelMember,
  convertGroupToChannel,
  sendChannelMessage,
  updateChannelMessage,
  deleteChannelMessage,
  dmIdFor,
  sendDmMessage,
  updateDmMessage,
  deleteDmMessage,
  markChatRead,
  setChatMuted,
  createChatCall,
  subscribeMessages,
  toggleMessageReaction,
  createMentions,
  toggleSavedMessage,
  indexChatFile,
  subscribeChatFiles,
  createChatBlob,
  cleanupMessageIndexes,
  sendThreadReply,
  updateThreadReply,
  deleteThreadReply,
  setTyping,
  subscribeTyping,
  markChatUnread,
  markManyChatRead,
  setMessagePinned,
  linkTaskToMessage,
  createChatReminder,
  deleteChatReminder,
  createTask,
  setDoNotDisturb,
} from '../../lib/firestore'
import {
  conversationKind,
  isMember,
  membersOf,
  userLabel,
  groupLabel,
  findDriveLink,
  driveDocType,
  typingNames,
  typingLabel,
  receiptFor,
  formatReminderTime,
  presenceOf,
} from '../../lib/chat'
import { withTimeout } from '../../lib/workspace'
import { useToast } from '../../hooks/useToast'
import { MessageIcon, SearchIcon } from '../icons'
import { MessageThread, ImageLightbox } from './ChatThread'
import Composer from './Composer'
import ChatSidebar from './ChatSidebar'
import ConversationHeader, { PinnedBar } from './ConversationHeader'
import { InboxView, ThreadsView, MentionsView, SavedView, FilesView, SearchView } from './ChatViews'
import NewConversationModal from './NewConversationModal'
import ConversationInfoPanel from './ConversationInfoPanel'
import MeetPopover from './MeetPopover'
import ProfilePanel from './ProfilePanel'
import ThreadPanel from './ThreadPanel'
import { useGoogleMeet } from '../../hooks/useGoogleMeet'
import TaskFromMessageModal from './TaskFromMessageModal'
import { ChatPeopleContext } from './PersonAvatar'
import { useChatData } from '../../hooks/useChatData'
import { makeLabelFor, buildChatIndexes } from '../../lib/chatIndexes'

// How many messages a conversation streams at first; "Cargar mensajes
// anteriores" adds another page. Keeps opening a busy channel light.
const PAGE_SIZE = 50
// Matches useMessageSearch's depth, so any search result can be scrolled to.
const SEARCH_DEPTH = 400

function actorNameFor(user) {
  return user?.displayName || user?.email?.split('@')[0] || 'Usuario'
}

export default function ChatModule({ user, focus, onFocusHandled, onNavigate }) {
  const { allChannels, users, myDms, profile, directory, mentions, saved, presence, reminders } = useChatData(user.uid)
  const [selected, setSelected] = useState(null) // {type:'conv', id} | {type:'dm', id: otherUid}
  const [messages, setMessages] = useState([])
  const [modal, setModal] = useState(null) // 'channel' | 'group' | null
  // One right-hand panel at a time: a channel/group's Detalles, or a
  // person's profile (from a DM header or an author name in a channel).
  const [panel, setPanel] = useState(null) // {type:'info'} | {type:'profile', uid} | null
  const [openCall, setOpenCall] = useState(null) // {type, anchorRef} | null
  const [searchQuery, setSearchQuery] = useState(null) // null = search bar closed
  // The sidebar's top section: Inbox / Menciones / Guardados / Archivos.
  // While one is open, no conversation is "open" — nothing streams and
  // nothing gets marked read behind the reader's back.
  const [view, setView] = useState(null)
  const [files, setFiles] = useState([])
  const [messageLimit, setMessageLimit] = useState(PAGE_SIZE)
  const [lightbox, setLightbox] = useState(null)
  const [typingDoc, setTypingDoc] = useState({})
  const [, setTick] = useState(0)
  const [callBusy, setCallBusy] = useState(null)
  const [taskDraft, setTaskDraft] = useState(null) // { message, parentId }
  const [pinsOpen, setPinsOpen] = useState(false)
  const [messageSearch, setMessageSearch] = useState('')
  // A jump from search can target a message older than the first page, so
  // the conversation opens with a deeper history in that case.
  const deepJumpRef = useRef(false)
  const meet = useGoogleMeet(user.uid)
  const jumpToRef = useRef(null)
  const showToast = useToast()
  const actorName = actorNameFor(user)

  useEffect(() => {
    if (!meet.connectError) return
    showToast(meet.connectError)
    meet.clearConnectError()
  }, [meet.connectError])
  useEffect(() => {
    if (!meet.justConnected) return
    showToast('Google conectado — ya puedes llamar en un clic.')
    meet.clearJustConnected()
  }, [meet.justConnected])
  // Presence and "escribiendo…" are time-based: re-evaluate every few
  // seconds so a dot turns off / a typing line disappears on its own.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000)
    return () => clearInterval(t)
  }, [])
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
    setMessageLimit(deepJumpRef.current ? SEARCH_DEPTH : PAGE_SIZE)
    deepJumpRef.current = false
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
  //
  // Only while the window is actually in front of the person — otherwise a
  // background tab would mark things read (and flip the other person's ✓✓)
  // without anyone having seen them. Coming back to the tab marks it then.
  const countFor = (key) => (allChannels.find((c) => c.id === key) || myDms.find((d) => d.id === key))?.messageCount
  // Where "Nuevos mensajes" goes: the read marker as it was the moment the
  // conversation opened — captured before opening it marks it read.
  const [newSince, setNewSince] = useState(null)
  useEffect(() => {
    setNewSince(activeConversationId ? profile?.chatLastRead?.[activeConversationId]?.toMillis?.() ?? null : null)
  }, [activeConversationId])

  const markReadIfVisible = (key) => {
    if (!key || document.visibilityState !== 'visible' || !document.hasFocus()) return
    markChatRead(user.uid, key, key.startsWith('thread_') ? undefined : countFor(key))
  }
  // Also re-runs when the open conversation's own doc changes (its
  // counter/last-message land a moment after the message itself), so a
  // conversation you're looking at never shows as unread in Inbox or the bell.
  const activeDoc = activeConversationId && (allChannels.find((c) => c.id === activeConversationId) || myDms.find((d) => d.id === activeConversationId))
  useEffect(() => {
    markReadIfVisible(activeConversationId)
  }, [activeConversationId, messages, user.uid, activeDoc?.messageCount])
  useEffect(() => {
    const onFocus = () => {
      markReadIfVisible(activeConversationId)
      if (panel?.type === 'thread') markReadIfVisible(`thread_${panel.parentId}`)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  })

  useEffect(() => subscribeTyping(activeConversationId, setTypingDoc), [activeConversationId])

  const fail = (verb) => (error) => showToast(`No se pudo ${verb}: ${error.message}`)

  const nameOf = (uid) => userLabel(users.find((u) => u.id === uid))
  const isMuted = (key) => Boolean(profile?.chatMuted?.[key])
  const labelFor = makeLabelFor({ uid: user.uid, users, allChannels })
  const { unreadMap, myMentions, myThreads, mySaved, savedIds, myFiles, inboxConversations, viewCounts } = buildChatIndexes({
    uid: user.uid,
    users,
    visible,
    myDms,
    profile,
    mentions,
    saved,
    files,
    labelFor,
  })

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
  const openConversation = ({ convType: type, convId, participantUids, messageId, threadParentId, deep }) => {
    jumpToRef.current = threadParentId || messageId || null
    if (deep) {
      deepJumpRef.current = true
      if (convId === selectedConversationId) setMessageLimit((n) => Math.max(n, SEARCH_DEPTH))
    }
    setView(null)
    if (threadParentId) setPanel({ type: 'thread', convId, parentId: threadParentId, jumpToId: messageId !== threadParentId ? messageId : null })
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

  const typers = typingNames(typingDoc, user.uid)

  // ✓ / ✓✓ on your own messages in DMs and private groups only.
  const receiptReaders =
    selected?.type === 'dm' ? [selected.id] : conversation && conversationKind(conversation) === 'group' ? (conversation.memberUids || []).filter((uid) => uid !== user.uid) : null
  const receiptOf = receiptReaders ? (m) => receiptFor(m, receiptReaders, users, selectedConversationId) : null

  const userPhoto = (uid) => users.find((u) => u.id === uid)?.photoDataUrl

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
  const handleSend = async (draft, parentId = null, parentMsg = null) => {
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
      const ref = parentId
        ? await withTimeout(sendThreadReply(convType, selectedConversationId, parentId, payload, user.uid, actorName))
        : convType === 'conv'
          ? await withTimeout(sendChannelMessage(selected.id, payload, user.uid, actorName))
          : await withTimeout(
              sendDmMessage(selectedConversationId, [{ uid: user.uid, name: actorName }, { uid: selected.id, name: userLabel(dmUser) }], payload, user.uid, actorName)
            )

      const pointer = { ...meta, messageId: ref.id, authorName: actorName, authorUid: user.uid, ...(parentId ? { threadParentId: parentId } : {}) }
      const snippet = (draft.text || (attachment ? '📎 Archivo' : '')).slice(0, 200)
      if (convType === 'conv' && draft.mentions?.length) createMentions(draft.mentions, { ...pointer, kind: 'mention', text: snippet }, user.uid, actorName).catch(() => {})
      // Slack's rule: everyone taking part in a thread (whoever wrote the
      // original + anyone who has replied) is notified of new replies —
      // except people already @mentioned in this reply, who get that instead.
      if (parentId) {
        const parent = parentMsg || messages.find((m) => m.id === parentId)
        const mentioned = new Set((draft.mentions || []).map((m) => m.uid))
        const followers = [...new Set([parent?.authorUid, ...(parent?.replyUids || [])])].filter((uid) => uid && uid !== user.uid && !mentioned.has(uid))
        if (followers.length) createMentions(followers.map((uid) => ({ uid })), { ...pointer, kind: 'reply', text: snippet }, user.uid, actorName).catch(() => {})
      }
      if (parentId) setTyping(`${selectedConversationId}_thread_${parentId}`, user.uid, actorName, false).catch(() => {})
      else setTyping(selectedConversationId, user.uid, actorName, false).catch(() => {})
      if (attachment?.kind === 'image') indexChatFile({ ...pointer, kind: 'image', thumbUrl: attachment.thumbUrl, blobId: attachment.blobId, name: attachment.name }).catch(() => {})
      if (attachment?.kind === 'voice') indexChatFile({ ...pointer, kind: 'voice', blobId: attachment.blobId, duration: attachment.duration, name: 'Nota de voz' }).catch(() => {})
      const drive = findDriveLink(draft.text)
      if (drive) indexChatFile({ ...pointer, kind: 'drive', url: drive, name: `${driveDocType(drive)} de Drive` }).catch(() => {})
    } catch (error) {
      fail('enviar')(error)
    }
  }

  const handleReact = (messageId, emoji, has, parentId = null) =>
    withTimeout(toggleMessageReaction(convType, selectedConversationId, messageId, emoji, user.uid, has, parentId)).catch(fail('reaccionar'))

  const handleToggleSave = (message, parentId = null) =>
    withTimeout(toggleSavedMessage(user.uid, message, { ...convMeta(), ...(parentId ? { threadParentId: parentId } : {}) }, savedIds.has(message.id))).catch(fail('guardar el mensaje'))

  const handleEditReply = (id, text, parentId) => {
    if (!parentId) return handleEditMessage(id, text)
    withTimeout(updateThreadReply(convType, selectedConversationId, parentId, id, text)).catch(fail('editar'))
  }

  const handleDeleteReply = (id, parentId) => {
    if (!parentId) return handleDeleteMessage(id)
    withTimeout(deleteThreadReply(convType, selectedConversationId, parentId, id))
      .then(() => cleanupMessageIndexes(id))
      .catch(fail('eliminar'))
  }

  // ---- Fijar / recordar / tarea ----
  const pinnedMap = activeDoc?.pinned || {}
  const pinnedIds = new Set(Object.keys(pinnedMap))
  const pinnedList = Object.entries(pinnedMap)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.pinnedAt?.toMillis?.() || 0) - (a.pinnedAt?.toMillis?.() || 0))

  const handleTogglePin = (m) =>
    withTimeout(setMessagePinned(convType, selectedConversationId, m, !pinnedIds.has(m.id), user.uid, actorName))
      .then(() => showToast(pinnedIds.has(m.id) ? 'Mensaje desfijado' : 'Mensaje fijado en la conversación'))
      .catch(fail('fijar el mensaje'))

  const handleRemind = (m, at, parentId = null) =>
    withTimeout(createChatReminder(user.uid, at, m, { ...convMeta(), ...(parentId ? { threadParentId: parentId } : {}) }))
      .then(() => showToast(`Te lo recordaré ${formatReminderTime(at)}`))
      .catch(fail('crear el recordatorio'))

  const confirmTask = async (data) => {
    const { message, parentId } = taskDraft
    try {
      const ref = await withTimeout(createTask(data, actorName, user.uid))
      await withTimeout(linkTaskToMessage(convType, selectedConversationId, message.id, { id: ref.id, title: data.title }, parentId))
      setTaskDraft(null)
      showToast('Tarea creada en Workspace')
    } catch (error) {
      fail('crear la tarea')(error)
    }
  }

  const openTask = (taskId) => onNavigate?.('workspace', { type: 'task', id: taskId })

  const jumpToMessage = (id) => {
    const el = document.getElementById(`msg-${id}`)
    if (!el) return showToast('Ese mensaje es más antiguo que los cargados — usa "Cargar mensajes anteriores".')
    el.scrollIntoView({ block: 'center' })
    el.animate([{ background: 'rgba(184,134,11,0.18)' }, { background: 'transparent' }], { duration: 1800, easing: 'ease-out' })
  }

  // Tied to the conversation it was opened in; switching away hides it.
  const openThread = (m) => setPanel({ type: 'thread', convId: selectedConversationId, parentId: m.id, jumpToId: null })

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
  //
  // The call doc is created first so the card posted in the thread can
  // carry its id and follow the call's live state (CallCard in ChatThread).
  const startCall = async (type, url) => {
    const isDm = selected.type === 'dm'
    const toUids = isDm ? [selected.id] : (conversation?.memberUids || []).filter((uid) => uid !== user.uid)
    let callId = null
    if (toUids.length) {
      const conversationLabel = isDm ? 'Mensaje directo' : `Grupo · ${groupLabel(conversation, users, user.uid)}`
      try {
        const ref = await withTimeout(
          createChatCall(
            { type, url, toUids, conversationLabel, conversationKey: selectedConversationId, convType, convId: selectedConversationId, participantUids: isDm ? [user.uid, selected.id] : null },
            user.uid,
            actorName
          )
        )
        callId = ref.id
      } catch (error) {
        fail('avisar la llamada')(error)
      }
    }
    handleSend({ call: { type, url, ...(callId ? { callId } : {}) } })
  }

  // One-click call (Google connected): open a tab right away — it has to
  // happen inside the click or the browser blocks it as a popup — create
  // the Meet room, point the tab at it, then post the card + ring the
  // other side. Anything fails → close the tab and fall back to the
  // manual popover, so a call is never a dead end.
  const quickCall = async (type, anchorRef, preOpened) => {
    const win = preOpened || window.open('', '_blank')
    try {
      win?.document.write('<title>Google Meet</title><body style="background:#0A0A0A;color:#999;font:14px system-ui;display:grid;place-items:center;height:100vh;margin:0">Creando la reunión…</body>')
    } catch {
      // cross-origin or blocked — fine, the redirect below still works
    }
    setCallBusy(type)
    try {
      const uri = await meet.createRoom()
      if (win) {
        win.opener = null
        win.location.href = uri
      } else window.open(uri, '_blank', 'noopener,noreferrer')
      await startCall(type, uri)
    } catch (error) {
      win?.close()
      showToast(`No se pudo crear la reunión automáticamente: ${error.message}`)
      setOpenCall({ type, anchorRef })
    } finally {
      setCallBusy(null)
    }
  }

  const toggleCall = (type, anchorRef) => {
    // Heads-up before calling someone who asked not to be disturbed.
    if (selected?.type === 'dm') {
      const their = presenceOf(presence[selected.id])
      if (their.status === 'dnd') showToast(`${nameOf(selected.id).split(' ')[0]} está en No molestar: no le sonará, verá la llamada perdida.`)
      else if (their.status === 'meeting') showToast(`${nameOf(selected.id).split(' ')[0]} está ${their.label.toLowerCase()}: le llegará sin sonido.`)
    }
    if (meet.status === 'ready' && !callBusy) return quickCall(type, anchorRef)
    setOpenCall((cur) => (cur?.anchorRef === anchorRef ? null : { type, anchorRef }))
  }

  // A profile opened from a channel whose "Llamar" is pressed: jump into
  // the DM with that person first, so the call card lands there. The call
  // itself starts once that DM is the open conversation (effect below);
  // the Meet tab is opened now, while we're still inside the click.
  const pendingCallRef = useRef(null)
  const callFromProfile = (uid, type, anchorRef) => {
    if (selected?.type === 'dm' && selected.id === uid) return toggleCall(type, anchorRef)
    const preOpened = meet.status === 'ready' ? window.open('', '_blank') : null
    pendingCallRef.current = { type, anchorRef, preOpened }
    setSelected({ type: 'dm', id: uid })
  }
  useEffect(() => {
    const pending = pendingCallRef.current
    if (!pending || selected?.type !== 'dm') return
    pendingCallRef.current = null
    if (pending.preOpened) quickCall(pending.type, pending.anchorRef, pending.preOpened)
    else setOpenCall({ type: pending.type, anchorRef: pending.anchorRef })
  }, [selectedConversationId])

  const showInfo = panel?.type === 'info' && conversation
  const profileUid = panel?.type === 'profile' ? panel.uid : null
  const profileUser = profileUid ? users.find((u) => u.id === profileUid) : null
  const profileInDm = selected?.type === 'dm' && selected.id === profileUid

  return (
    <ChatPeopleContext.Provider value={{ users, directory, presence }}>
    <div className={`mx-auto flex h-full w-full max-w-[1320px] py-8 ${panel && !view ? 'gap-5 px-8' : 'gap-8 px-12'}`}>
      <ChatSidebar
        channels={channels}
        groups={groups}
        users={users}
        presence={presence}
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
        onSearchMessages={(q) => {
          setMessageSearch(q)
          setView('search')
        }}
        onSetDnd={(until) =>
          withTimeout(setDoNotDisturb(user.uid, until))
            .then(() => showToast(until ? `No molestar activado hasta ${until.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : 'Estás disponible'))
            .catch(fail('cambiar tu estado'))
        }
        calendarConnected={meet.status === 'ready' || Boolean(profile?.googleCalendar?.refreshToken)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {view === 'inbox' ? (
          <InboxView
            conversations={inboxConversations}
            onOpen={openConversation}
            onMarkRead={(c) => withTimeout(markChatRead(user.uid, c.key, c.messageCount)).catch(fail('marcar como leído'))}
            onMarkUnread={(c) => withTimeout(markChatUnread(user.uid, c.key, c.lastAt, c.messageCount)).catch(fail('marcar como no leído'))}
            onMarkAllRead={(list) => withTimeout(markManyChatRead(user.uid, list.map((c) => ({ key: c.key, count: c.messageCount })))).catch(fail('marcar todo como leído'))}
          />
        ) : view === 'search' ? (
          <SearchView
            query={messageSearch}
            onQueryChange={setMessageSearch}
            conversations={inboxConversations.map((c) => ({ convType: c.convType, convId: c.convId, participantUids: c.participantUids, label: c.convType === 'dm' ? `Mensaje directo · ${c.label.split(' ')[0]}` : labelFor(c.convType, c.convId) }))}
            onOpen={openConversation}
          />
        ) : view === 'threads' ? (
          <ThreadsView threads={myThreads} onOpen={openConversation} />
        ) : view === 'mentions' ? (
          <MentionsView mentions={myMentions} onOpen={openConversation} />
        ) : view === 'saved' ? (
          <SavedView
            reminders={reminders.filter((r) => !r.done).sort((a, b) => (a.remindAt?.toMillis?.() || 0) - (b.remindAt?.toMillis?.() || 0))}
            onCancelReminder={(r) => withTimeout(deleteChatReminder(r.id)).catch(fail('cancelar el recordatorio'))}
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
              dmPresence={dmUser && presence[dmUser.id]}
              users={users}
              currentUid={user.uid}
              infoOpen={showInfo}
              profileOpen={Boolean(profileUid) && profileInDm}
              onToggleInfo={() => setPanel((p) => (p?.type === 'info' ? null : { type: 'info' }))}
              onToggleProfile={() => setPanel((p) => (p?.type === 'profile' && p.uid === selected.id ? null : { type: 'profile', uid: selected.id }))}
              openCall={openCall}
              onCall={toggleCall}
              callBusy={callBusy}
            />
            {pinnedList.length > 0 && (
              <PinnedBar
                pins={pinnedList}
                open={pinsOpen}
                onToggle={() => setPinsOpen((v) => !v)}
                onJump={(id) => {
                  setPinsOpen(false)
                  jumpToMessage(id)
                }}
                onUnpin={(id) => handleTogglePin({ id })}
              />
            )}
            {searchQuery !== null && (
              <div className="mt-3 flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-3.5 py-2">
                <SearchIcon size={12} className="text-[#858585]" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setSearchQuery(null)}
                  placeholder="Buscar en esta conversación..."
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#F5F5F5] placeholder:text-[#858585] outline-none"
                />
                <button type="button" onClick={() => setSearchQuery(null)} className="text-[12.5px] text-[#858585] hover:text-[#F5F5F5]">
                  Cerrar
                </button>
              </div>
            )}
            <MessageThread
              conversationKey={activeConversationId}
              isDm={selected.type === 'dm'}
              newSince={newSince}
              messages={messages}
              currentUid={user.uid}
              query={searchQuery}
              hasMore={messages.length >= messageLimit}
              onLoadMore={() => setMessageLimit((n) => n + PAGE_SIZE)}
              savedIds={savedIds}
              userName={nameOf}
              userPhoto={userPhoto}
              receiptFor={receiptOf}
              onOpenThread={openThread}
              pinnedIds={pinnedIds}
              onTogglePin={handleTogglePin}
              onRemind={(m, at) => handleRemind(m, at)}
              onCreateTask={(m) => setTaskDraft({ message: m, parentId: null })}
              onOpenTask={openTask}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onOpenProfile={(uid) => setPanel({ type: 'profile', uid })}
              onReact={handleReact}
              onToggleSave={handleToggleSave}
              onOpenImage={setLightbox}
            />
            <p className="h-4 px-1 text-[11px] italic text-[#777777]">{typingLabel(typers)}</p>
            <Composer
              key={selectedConversationId}
              onSend={(draft) => handleSend(draft)}
              onTyping={(typing) => setTyping(selectedConversationId, user.uid, actorName, typing).catch(() => {})}
              onError={showToast}
              mentionCandidates={mentionCandidates}
              placeholder={selected.type === 'dm' ? `Mensaje a ${userLabel(dmUser).split(' ')[0]}...` : mentionCandidates.length ? 'Escribe un mensaje... usa @ para mencionar' : undefined}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageIcon size={20} className="text-[#5A5A5A]" />
            <p className="max-w-[360px] text-[13.5px] leading-relaxed text-[#767676]">
              Escribe un mensaje directo a alguien, abre un grupo privado, o crea el primer canal — empieza por <span className="text-[#888888]">#general</span>.
            </p>
            <button type="button" onClick={() => setModal('channel')} className="ador-btn-primary mt-3 rounded-xl px-4 py-2 text-[12.5px] font-medium">
              Crear canal
            </button>
          </div>
        )}
      </div>

      {taskDraft && (
        <TaskFromMessageModal
          message={taskDraft.message}
          conversationLabel={convType === 'dm' ? `tu chat con ${userLabel(dmUser)}` : labelFor(convType, selectedConversationId, null)}
          users={users}
          currentUid={user.uid}
          actorName={actorName}
          onClose={() => setTaskDraft(null)}
          onConfirm={confirmTask}
        />
      )}

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

      {panel?.type === 'thread' && !view && panel.convId === selectedConversationId && (
        <ThreadPanel
          key={panel.parentId}
          convType={convType}
          convId={selectedConversationId}
          parentId={panel.parentId}
          jumpToId={panel.jumpToId}
          conversationLabel={labelFor(convType, selectedConversationId, convType === 'dm' ? [user.uid, selected.id] : null)}
          currentUid={user.uid}
          savedIds={savedIds}
          userName={nameOf}
          userPhoto={userPhoto}
          mentionCandidates={mentionCandidates}
          onClose={() => setPanel(null)}
          onSend={(draft, parentMsg) => handleSend(draft, panel.parentId, parentMsg)}
          onTyping={(typing) => setTyping(`${selectedConversationId}_thread_${panel.parentId}`, user.uid, actorName, typing).catch(() => {})}
          onEdit={handleEditReply}
          onDelete={handleDeleteReply}
          onReact={handleReact}
          onToggleSave={handleToggleSave}
          onOpenProfile={(uid) => setPanel({ type: 'profile', uid })}
          onOpenImage={setLightbox}
          onRead={() => markReadIfVisible(`thread_${panel.parentId}`)}
          onRemind={(m, at) => handleRemind(m, at, m.id === panel.parentId ? null : panel.parentId)}
          onCreateTask={(m) => setTaskDraft({ message: m, parentId: m.id === panel.parentId ? null : panel.parentId })}
          onOpenTask={openTask}
          onError={showToast}
        />
      )}

      {profileUser && !view && (
        <ProfilePanel
          key={profileUid}
          person={profileUser}
          directoryEntry={directoryFor(profileUid)}
          presence={presence[profileUid]}
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
            startCall(openCall.type, url)
            setOpenCall(null)
          }}
          canConnect={meet.status === 'needsConnect'}
          onConnect={meet.connect}
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
    </ChatPeopleContext.Provider>
  )
}

import { useEffect, useState } from 'react'
import { subscribeUserProfile, subscribeMyDms, subscribeChatChannels, subscribeMyMentions, subscribeUsers, subscribeMyReminders, updateChatReminder } from '../lib/firestore'
import { conversationKind, isMember, groupLabel, userLabel } from '../lib/chat'

function newerThan(ts, lastRead) {
  const t = ts?.toMillis?.() || 0
  return t > (lastRead?.toMillis?.() || 0)
}

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const diff = (Date.now() - ts.toDate().getTime()) / 60000
  if (diff < 1) return 'ahora'
  if (diff < 60) return `${Math.floor(diff)} min`
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} h`
  return `${Math.floor(diff / 1440)} d`
}

// Comunicación's contribution to the top-bar bell. Deliberately only the
// things addressed to *you*: @mentions, direct messages, and your private
// groups, plus replies in threads you take part in. Ordinary channel
// chatter never reaches the bell — that's what
// the sidebar's unread dots and Inbox are for; ringing the bell for every
// #general message would train everyone to ignore it.
//
// "Unread" reuses users/{uid}.chatLastRead (the same timestamps the chat
// sidebar uses), so opening a conversation clears it here too, with no
// separate notification state to keep in sync. Muted conversations stay
// out, mentions included only if they come from a conversation you can
// still see.
export function useChatNotifications(uid, onNavigate) {
  const [profile, setProfile] = useState(null)
  const [dms, setDms] = useState([])
  const [channels, setChannels] = useState([])
  const [mentions, setMentions] = useState([])
  const [users, setUsers] = useState([])
  const [reminders, setReminders] = useState([])

  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeUserProfile(uid, setProfile)
  }, [uid])
  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeMyDms(uid, setDms)
  }, [uid])
  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeMyMentions(uid, setMentions)
  }, [uid])
  useEffect(() => {
    if (!uid || uid === 'preview') return
    return subscribeMyReminders(uid, setReminders)
  }, [uid])
  useEffect(() => subscribeChatChannels(setChannels), [])
  useEffect(() => subscribeUsers(setUsers), [])

  if (!uid || uid === 'preview') return []

  const lastRead = profile?.chatLastRead || {}
  const muted = profile?.chatMuted || {}
  const mine = channels.filter((c) => isMember(c, uid))
  const visibleKeys = new Set([...mine.map((c) => c.id), ...dms.map((d) => d.id)])
  const labelOf = (convId) => {
    const c = channels.find((x) => x.id === convId)
    if (!c) return 'un canal'
    return conversationKind(c) === 'group' ? groupLabel(c, users, uid) : `#${c.name}`
  }

  const items = []

  // Mentions and thread replies share chatMentions; one inside a thread is
  // read once that thread is opened (`thread_{parentId}`). Several replies
  // in the same thread collapse into one bell item.
  const seenThreads = new Set()
  for (const m of [...mentions].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))) {
    const readKey = m.threadParentId ? `thread_${m.threadParentId}` : m.conversationKey
    if (!visibleKeys.has(m.conversationKey) || muted[m.conversationKey] || !newerThan(m.createdAt, lastRead[readKey])) continue
    const isReply = m.kind === 'reply'
    if (isReply && seenThreads.has(m.threadParentId)) continue
    if (isReply) seenThreads.add(m.threadParentId)
    const where = m.convType === 'dm' ? 'tu mensaje directo' : labelOf(m.convId)
    items.push({
      at: m.createdAt?.toMillis?.() || 0,
      text: isReply
        ? `${m.fromName} respondió en un hilo de ${where}${m.text ? ` — “${m.text.slice(0, 60)}”` : ''}`
        : `${m.fromName} te mencionó en ${where}${m.text ? ` — “${m.text.slice(0, 60)}”` : ''}`,
      time: timeAgo(m.createdAt),
      onClick: () =>
        onNavigate('chat', { type: 'chat', convType: m.convType, convId: m.convId, participantUids: m.participantUids, messageId: m.messageId, threadParentId: m.threadParentId }),
    })
  }

  for (const d of dms) {
    const last = d.lastMessage
    if (!last || last.authorUid === uid || muted[d.id] || !newerThan(d.updatedAt, lastRead[d.id])) continue
    const other = (d.participantUids || []).find((x) => x !== uid)
    const name = userLabel(users.find((u) => u.id === other)) || d.participantNames?.[other]
    items.push({
      at: d.updatedAt?.toMillis?.() || 0,
      text: `${name}: ${last.text || 'Nuevo mensaje'}`,
      time: timeAgo(d.updatedAt),
      onClick: () => onNavigate('chat', { type: 'chat', convType: 'dm', convId: d.id, participantUids: d.participantUids }),
    })
  }

  for (const g of mine.filter((c) => conversationKind(c) === 'group')) {
    const last = g.lastMessage
    if (!last || last.authorUid === uid || muted[g.id] || !newerThan(g.lastMessageAt, lastRead[g.id])) continue
    items.push({
      at: g.lastMessageAt?.toMillis?.() || 0,
      text: `${groupLabel(g, users, uid)} · ${(last.authorName || '').split(' ')[0]}: ${last.text || 'Nuevo mensaje'}`,
      time: timeAgo(g.lastMessageAt),
      onClick: () => onNavigate('chat', { type: 'chat', convType: 'conv', convId: g.id }),
    })
  }

  // Reminders that are due and not handled yet — first, since you asked
  // for them yourself.
  const reminderItems = reminders
    .filter((r) => !r.done && r.remindAt?.toMillis && r.remindAt.toMillis() <= Date.now())
    .map((r) => ({
      at: Number.MAX_SAFE_INTEGER - r.remindAt.toMillis(),
      text: `⏰ Recordatorio: ${r.authorName ? `${r.authorName.split(' ')[0]}: ` : ''}${(r.text || '').slice(0, 70)}`,
      time: timeAgo(r.remindAt),
      onClick: () => {
        updateChatReminder(r.id, { done: true }).catch(() => {})
        onNavigate('chat', { type: 'chat', convType: r.convType, convId: r.convId, participantUids: r.participantUids, messageId: r.messageId, threadParentId: r.threadParentId })
      },
    }))

  return [...reminderItems, ...items.sort((a, b) => b.at - a.at)].slice(0, 10)
}
